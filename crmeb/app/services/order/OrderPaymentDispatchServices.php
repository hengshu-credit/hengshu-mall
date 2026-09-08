<?php
namespace app\services\order;

use app\dao\order\StoreOrderStatusDao;
use app\jobs\AgentJob;
use app\jobs\notice\PrintJob;
use app\jobs\OrderInvoiceJob;
use app\jobs\OrderJob;
use app\jobs\ProductLogJob;
use app\jobs\PinkJob;
use app\jobs\MiniOrderJob;
use app\services\activity\combination\StorePinkServices;
use app\services\activity\combination\StoreCombinationServices;
use app\services\activity\lottery\LuckLotteryServices;
use app\services\wechat\WechatUserServices;
use app\services\BaseServices;
use crmeb\utils\AfterCommit;
use crmeb\utils\Queue;

/** Recoverable payment delivery stages, stored alongside the existing payment status record. */
class OrderPaymentDispatchServices extends BaseServices
{
    const PENDING = 'pay_dispatch_pending';
    private static $publishing = false;
    private static $queueFailed = false;

    public function __construct(StoreOrderStatusDao $dao) { $this->dao = $dao; }

    public static function isPublishing(): bool { return self::$publishing; }

    /** Some existing notice listeners catch transport errors; keep the stage pending anyway. */
    public static function recordQueueFailure(): void
    {
        self::recordDeliveryFailure();
    }

    public static function recordDeliveryFailure(): void
    {
        if (self::$publishing) self::$queueFailed = true;
    }

    /** Called with the unpaid order locked, before the payment transaction commits. */
    public function stage(int $orderId, string $step): void
    {
        if (!$this->dao->save(['oid' => $orderId, 'change_type' => self::PENDING,
            'change_message' => $step, 'change_time' => time()])) {
            throw new \RuntimeException('Unable to record payment delivery');
        }
    }

    /** Nested fulfillment may stage work for several already-paid group orders. */
    public function stageAfterCommit(int $orderId, string $step): void
    {
        $this->stage($orderId, $step);
        AfterCommit::defer(function () use ($orderId) { $this->flush($orderId); });
    }

    /** A retry of an already-paid callback resumes only unpublished stages. */
    public function flush(int $orderId): void
    {
        $steps = $this->dao->getColumn(['oid' => $orderId, 'change_type' => self::PENDING], 'change_message');
        foreach ($steps as $step) {
            $this->transaction(function () use ($orderId, $step) {
                $order = app()->make(StoreOrderSuccessServices::class)->getOneForUpdate(['id' => $orderId]);
                if (!$order || !$order['paid']) return;
                $where = ['oid' => $orderId, 'change_type' => self::PENDING, 'change_message' => $step];
                if (!$this->dao->getOne($where)) return;
                $previous = self::$publishing;
                $previousFailure = self::$queueFailed;
                self::$publishing = true;
                self::$queueFailed = false;
                try {
                    if ($this->publish($step, $order->toArray()) === false || self::$queueFailed) {
                        throw new \RuntimeException('Unable to publish payment delivery');
                    }
                    if (!$this->dao->delete($where)) throw new \RuntimeException('Unable to acknowledge payment delivery');
                } finally {
                    self::$publishing = $previous;
                    self::$queueFailed = $previousFailure;
                    Queue::instance()->clean();
                }
            });
        }
    }

    protected function publish(string $step, array $order)
    {
        if (strpos($step, 'pink_') === 0) return $this->publishPink($step, $order);
        switch ($step) {
            case 'lottery': return app()->make(LuckLotteryServices::class)->setCacheLotteryNum((int)$order['uid'], 'order');
            case 'virtual_shipping':
                return MiniOrderJob::dispatchSecs(10, 'doJob', [
                    $order['order_id'], 3,
                    [['item_desc' => $order['virtual_type'] == 1 ? '卡密自动发货' : '优惠券自动发货']],
                    app()->make(WechatUserServices::class)->uidToOpenid($order['uid'], 'routine'),
                    'pages/goods/order_details/index?order_id=' . $order['order_id'],
                ]);
            case 'invoice':
                $invoice = app()->make(StoreOrderInvoiceServices::class)->get(['order_id' => $order['id']]);
                return $invoice ? OrderInvoiceJob::dispatchSecs(10, 'autoInvoice', [$invoice['id']]) : true;
            case 'print': return PrintJob::dispatch([$order['id'], 1]);
            case 'order': return OrderJob::dispatch([$order]);
            case 'agent': return AgentJob::dispatch([(int)$order['uid']]);
            case 'product': return ProductLogJob::dispatch(['pay', ['uid' => $order['uid'], 'order_id' => $order['id']]]);
        }
        $order['storeName'] = app()->make(StoreOrderCartInfoServices::class)->getCarIdByProductTitle((int)$order['id']);
        $order['send_name'] = $order['real_name'];
        $order['time'] = date('Y-m-d H:i:s', $order['pay_time']);
        $order['phone'] = $order['user_phone'];
        switch ($step) {
            case 'notice_user': event('NoticeListener', [$order, 'order_pay_success']); break;
            case 'notice_admin': event('NoticeListener', [$order, 'admin_pay_success_code']); break;
            case 'out_push': event('OutPushListener', ['order_pay_push', ['order_id' => (int)$order['id']]]); break;
            case 'custom_notice': event('CustomNoticeListener', [$order['uid'], $order, 'order_pay_success']); break;
            case 'custom_event':
                event('CustomEventListener', ['order_pay', [
                    'uid' => $order['uid'], 'id' => (int)$order['id'], 'order_id' => $order['order_id'],
                    'real_name' => $order['real_name'], 'user_phone' => $order['user_phone'],
                    'user_address' => $order['user_address'], 'total_num' => $order['total_num'],
                    'pay_price' => $order['pay_price'], 'pay_postage' => $order['pay_postage'],
                    'deduction_price' => $order['deduction_price'], 'coupon_price' => $order['coupon_price'],
                    'store_name' => $order['storeName'], 'add_time' => date('Y-m-d H:i:s', $order['add_time']),
                ]]);
                break;
            default: throw new \RuntimeException('Unknown payment delivery stage');
        }
        return true;
    }

    protected function publishPink(string $step, array $order)
    {
        [$action, $pinkId] = array_pad(explode(':', $step, 2), 2, 0);
        $pinks = app()->make(StorePinkServices::class);
        $pink = $pinks->getOne(['id' => (int)$pinkId]);
        if (!$pink) throw new \RuntimeException('Payment group delivery record is missing');
        if ($action === 'pink_expire') {
            return PinkJob::dispatchSecs(max(1, (int)$pink['stop_time'] + 60 - time()), [(int)$pinkId]);
        }
        $title = app()->make(StoreCombinationServices::class)->value(['id' => $pink['cid']], 'title');
        if ($action === 'pink_fail' || $action === 'pink_clone') {
            $pink = $pinks->getOne(['id' => (int)$pinkId], '*', ['getProduct']);
            event('NoticeListener', [['uid' => $pink['uid'], 'pink' => $pink, 'user_type' => $order['is_channel']],
                $action === 'pink_clone' ? 'send_order_pink_clone' : 'send_order_pink_fial']);
        } elseif ($action === 'pink_complete') {
            $pink = $pink->toArray();
            $pink['nickname'] = $pinks->value(['id' => $pink['k_id'] ?: $pink['id']], 'nickname');
            event('NoticeListener', [['list' => $pink, 'title' => $title, 'user_type' => $order['is_channel'],
                'url' => '/pages/users/order_details/index?order_id=' . $order['order_id']], 'order_user_groups_success']);
        } elseif ($action === 'pink_open' || $action === 'pink_join') {
            event('NoticeListener', [['orderInfo' => $order, 'title' => $title, 'pink' => $pink->toArray()],
                $action === 'pink_open' ? 'open_pink_success' : 'can_pink_success']);
        } else {
            throw new \RuntimeException('Unknown payment group delivery stage');
        }
        return true;
    }
}
