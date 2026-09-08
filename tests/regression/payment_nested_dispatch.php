<?php
define('PAYMENT_NESTED_BOOTSTRAP', true);
require __DIR__ . '/payment_dispatch.php';
$checks = [];
$nestedEvents = [];
putenv('AUDIT_NESTED_CAPTURE=1'); putenv('AUDIT_DISPATCH_QUEUE=1');
$container->instance('env', new class { public function get($key, $default = null) { return $key === 'cache.driver' ? 'redis' : $default; } });
$container->instance('config', new class { public function get($key, $default = null) { return $default; } });
$container->instance('log', new class { public function error($message) {} });
$transport = new class {
    public $jobs = [];
    public function connection() { return $this; }
    public function later(...$args) { $this->jobs[] = $args; return 'job-id'; }
    public function push(...$args) { $this->jobs[] = $args; return 'job-id'; }
};
$container->instance('queue', $transport);
$fields = $db->getFields('audit_queue_orders');
foreach (['pink_id' => 'INT DEFAULT 0', 'cart_id' => 'VARCHAR(32) DEFAULT "[1]"', 'is_channel' => 'INT DEFAULT 1',
    'status' => 'INT DEFAULT 0', 'delivery_type' => 'VARCHAR(32) DEFAULT ""', 'virtual_info' => 'VARCHAR(64) DEFAULT ""', 'remark' => 'VARCHAR(256) DEFAULT ""'] as $field => $definition) {
    if (!isset($fields[$field])) $db->execute('ALTER TABLE audit_queue_orders ADD ' . $field . ' ' . $definition);
}
$db->execute('CREATE TABLE IF NOT EXISTS audit_queue_pinks (id INT AUTO_INCREMENT PRIMARY KEY, uid INT, nickname VARCHAR(30), avatar VARCHAR(30), order_id VARCHAR(64), order_id_key INT, total_num INT, total_price DECIMAL(12,2), k_id INT, cid INT, pid INT, people INT, price DECIMAL(12,2), stop_time INT, add_time INT, status INT DEFAULT 1, is_tpl INT DEFAULT 0) ENGINE=InnoDB');
if (!isset($db->getFields('audit_queue_pinks')['is_refund'])) $db->execute('ALTER TABLE audit_queue_pinks ADD is_refund INT DEFAULT 0');
class NestedPinkModel extends think\Model { protected $table = 'audit_queue_pinks'; }
class NestedPinkDao extends app\dao\activity\combination\StorePinkDao { protected function setModel(): string { return NestedPinkModel::class; } }
class NestedPinkService extends app\services\activity\combination\StorePinkServices {
    public $completeOnJoin = false;
    public function isPinkBe(array $data, int $id) { return false; }
    public function getPinkMemberAndPinkK($pink) {
        if ($this->completeOnJoin) {
            $master = $this->dao->getOne(['id' => $pink['k_id']])->toArray();
            $member = $this->dao->getOne(['order_id_key' => 1, 'k_id' => $pink['k_id']]);
            return [[], $master, 0, [$master['id'], $member['id']], [101, 202]];
        }
        return [[], ['status' => 0], 1, [], []];
    }
}
$pinkService = new NestedPinkService(new NestedPinkDao);
$container->instance(app\services\activity\combination\StorePinkServices::class, $pinkService);
$container->instance(app\services\activity\combination\StoreCombinationServices::class, new class {
    public function getOne(...$args) { return new NestedPinkModel(['effective_time' => 1, 'title' => 'fixture', 'people' => 2]); }
    public function value(...$args) { return 'fixture'; }
});
$container->instance(app\services\user\UserServices::class, new class { public function get($uid) { return ['nickname' => 'fixture', 'avatar' => 'fixture']; } });
$container->instance(app\services\order\StoreOrderServices::class, new class($orderDao) extends app\services\BaseServices {
    public function __construct($dao) { $this->dao = $dao; }
});
$container->instance(app\services\order\StoreOrderCartInfoServices::class, new class {
    public function getOrderCartInfo($id) { return [1 => ['cart_info' => ['productInfo' => ['attrInfo' => ['coupon_id' => 1]]]]]; }
    public function getCarIdByProductTitle($id) { return 'fixture'; }
});
$container->instance(app\services\activity\coupon\StoreCouponIssueServices::class, new class { public $grants = 0; public function get($id) { return ['id' => $id]; } public function setCoupon(...$args) { $this->grants++; return true; } });
$container->instance(app\services\wechat\WechatUserServices::class, new class { public function uidToOpenid(...$args) { return 'fixture-openid'; } });
$delivery = new class($orderDao) extends app\services\order\StoreOrderDeliveryServices {
    public $failFulfillment = false;
    public function virtualSend($orderInfo) { if ($this->failFulfillment) throw new RuntimeException('virtual fulfillment unavailable'); return parent::virtualSend($orderInfo); }
    public function SystemSend(int $uid, array $noticeInfo) {}
};
$container->instance(app\services\order\StoreOrderDeliveryServices::class, $delivery);
$lottery = new class { public $grants = 0; public function setCacheLotteryNum(...$args) { $this->grants++; return true; } };
$container->instance(app\services\activity\lottery\LuckLotteryServices::class, $lottery);
class NestedDispatch extends app\services\order\OrderPaymentDispatchServices {
    public $published = []; public $failStep = '';
    protected function publish(string $step, array $order) {
        global $worker;
        $this->published[] = ['step' => $step, 'paid' => (int)$worker->table('audit_queue_orders')->where('id', $order['id'])->value('paid')];
        if ($step === $this->failStep) return false;
        if (strpos($step, 'pink_') === 0 || $step === 'virtual_shipping' || $step === 'lottery') return parent::publish($step, $order);
        return true;
    }
}
$dispatch = new NestedDispatch($statusDao);
$container->instance(app\services\order\OrderPaymentDispatchServices::class, $dispatch);
function seedNested() {
    global $db, $transport, $nestedEvents, $lottery;
    seedDispatch(); $db->table('audit_queue_pinks')->where('1=1')->delete(); $transport->jobs = []; $nestedEvents = []; $lottery->grants = 0;
    app()->make(app\services\activity\coupon\StoreCouponIssueServices::class)->grants = 0;
}
function pinkOrder($pinkId = 0) {
    global $orderDao;
    return array_merge($orderDao->getOne(['id' => 1])->toArray(), ['pink_id' => $pinkId, 'combination_id' => 1,
        'cartInfo' => [['combination_id' => 1, 'product_id' => 1, 'productInfo' => ['price' => '60']]]]);
}
seedNested();
$service->transaction(function () use ($db, $pinkService, $transport, &$nestedEvents) {
    $db->table('audit_queue_orders')->where('id', 1)->update(['paid' => 1]);
    $pinkService->createPink(pinkOrder());
    checkDispatch('new group expiry job and notice stay pending before commit', !$transport->jobs && !$nestedEvents);
});
checkDispatch('new group publishes expiry and notice after commit', count($transport->jobs) === 1 && count($nestedEvents) === 1 && count($dispatch->published) === 2 && array_column($dispatch->published, 'paid') === [1, 1], $dispatch->published);
seedNested();
try { $service->transaction(function () use ($db, $pinkService) {
    $db->table('audit_queue_orders')->where('id', 1)->update(['paid' => 1]); $pinkService->createPink(pinkOrder()); throw new RuntimeException('later listener failure');
}); } catch (RuntimeException $error) {}
checkDispatch('group rollback discards notices jobs and pink rows', !$transport->jobs && !$nestedEvents && $db->table('audit_queue_pinks')->count() === 0 && $db->table('audit_queue_status')->count() === 0);
seedNested();
$service->transaction(function () use ($db, $pinkService, &$nestedEvents) {
    $db->table('audit_queue_orders')->where('id', 1)->update(['paid' => 1]); $pinkService->createPink(pinkOrder(42));
    checkDispatch('joining group notice remains pending before commit', !$nestedEvents);
});
checkDispatch('joining group publishes notice after commit', count($nestedEvents) === 1 && count($dispatch->published) === 1 && $dispatch->published[0]['paid'] === 1, $dispatch->published);
seedNested();
$db->table('audit_queue_pinks')->insert(['id' => 999, 'uid' => 101, 'nickname' => 'master', 'order_id' => 'dispatch-order', 'order_id_key' => 1, 'k_id' => 0, 'cid' => 1, 'people' => 2, 'add_time' => time()]);
$service->transaction(function () use ($db, $pinkService, &$nestedEvents) {
    $db->table('audit_queue_orders')->where('id', 1)->update(['paid' => 1]);
    $pinkService->orderPinkAfter([101], 999);
    checkDispatch('completed group notification stays pending before commit', !$nestedEvents);
});
checkDispatch('completed group reconstructs member and master notification after commit', count($nestedEvents) === 1 && $nestedEvents[0][1][0]['list']['nickname'] === 'master' && $dispatch->published[0]['paid'] === 1);
seedNested();
$db->table('audit_queue_orders')->where('id', 1)->update(['paid' => 1, 'virtual_type' => 2, 'pay_type' => 'yue']);
$db->table('audit_queue_pinks')->insert(['id' => 1001, 'uid' => 101, 'nickname' => 'master', 'order_id' => 'dispatch-order', 'order_id_key' => 1, 'k_id' => 0, 'cid' => 1, 'people' => 2, 'add_time' => time()]);
$dispatch->failStep = 'pink_complete:1001';
// Real cron/API entry: no surrounding payment transaction.
$pinkService->pinkComplete([101], [1001], 101, ['id' => 1001]);
checkDispatch('non-payment group completion finishes virtual fulfillment despite notice outage', (int)$db->table('audit_queue_orders')->value('status') === 1 && (int)$db->table('audit_queue_pinks')->value('status') === 2 && (int)$db->table('audit_queue_pinks')->value('is_tpl') === 1 && $db->table('audit_queue_status')->where('change_type', $dispatch::PENDING)->count() === 1);
$dispatch->failStep = ''; $dispatch->flush(1);
checkDispatch('non-payment group notice retry does not repeat coupon fulfillment', $db->table('audit_queue_status')->where('change_type', $dispatch::PENDING)->count() === 0 && app()->make(app\services\activity\coupon\StoreCouponIssueServices::class)->grants === 1);
seedNested();
$db->table('audit_queue_orders')->where('id', 1)->update(['paid' => 1, 'virtual_type' => 2, 'pay_type' => 'yue']);
$db->table('audit_queue_pinks')->insert(['id' => 1501, 'uid' => 101, 'nickname' => 'master', 'order_id' => 'dispatch-order', 'order_id_key' => 1, 'k_id' => 0, 'cid' => 1, 'people' => 2, 'add_time' => time()]);
$dispatch->failStep = 'pink_complete:1501';
try { $pinkService->successPinkEdit([1501]); } catch (RuntimeException $error) {}
checkDispatch('admin direct group completion finishes virtual fulfillment before notice failure', (int)$db->table('audit_queue_orders')->value('status') === 1 && (int)$db->table('audit_queue_pinks')->value('is_tpl') === 1 && $db->table('audit_queue_status')->where('change_type', $dispatch::PENDING)->count() === 1);
$dispatch->failStep = ''; $dispatch->flush(1);
checkDispatch('admin group notice retries without repeating virtual fulfillment', app()->make(app\services\activity\coupon\StoreCouponIssueServices::class)->grants === 1 && $db->table('audit_queue_status')->where('change_type', $dispatch::PENDING)->count() === 0);
seedNested();
$db->table('audit_queue_orders')->insert(['id' => 2, 'order_id' => 'master-order', 'uid' => 202, 'paid' => 1]);
$db->table('audit_queue_orders')->where('id', 1)->update(['virtual_type' => 2, 'pay_type' => 'yue']);
$db->table('audit_queue_pinks')->insert(['id' => 2001, 'uid' => 202, 'nickname' => 'master', 'order_id' => 'master-order', 'order_id_key' => 2, 'k_id' => 0, 'cid' => 1, 'people' => 2, 'add_time' => time()]);
$pinkService->completeOnJoin = true; $delivery->failFulfillment = true; $blocked = false;
try { $service->transaction(function () use ($db, $pinkService) {
    $db->table('audit_queue_orders')->where('id', 1)->update(['paid' => 1]); $pinkService->createPink(pinkOrder(2001));
}); } catch (RuntimeException $error) { $blocked = true; }
checkDispatch('payment group fulfillment failure propagates and rolls back paid state', $blocked && (int)$db->table('audit_queue_orders')->where('id', 1)->value('paid') === 0 && $db->table('audit_queue_pinks')->count() === 1 && $db->table('audit_queue_status')->count() === 0);
$delivery->failFulfillment = false;
$service->transaction(function () use ($db, $pinkService) {
    $db->table('audit_queue_orders')->where('id', 1)->update(['paid' => 1]); $pinkService->createPink(pinkOrder(2001));
});
checkDispatch('payment group retry can finish fulfillment after business recovery', (int)$db->table('audit_queue_orders')->where('id', 1)->value('paid') === 1 && (int)$db->table('audit_queue_orders')->where('id', 1)->value('status') === 1 && $db->table('audit_queue_status')->where('change_type', $dispatch::PENDING)->count() === 0);
$pinkService->completeOnJoin = false;
seedNested();
$service->transaction(function () use ($db, $delivery, $orderDao, $transport) {
    $db->table('audit_queue_orders')->where('id', 1)->update(['paid' => 1, 'pay_type' => 'weixin', 'virtual_type' => 2]);
    $order = $orderDao->getOne(['id' => 1])->toArray(); $order['cart_id'] = [1]; $delivery->virtualSend($order);
    checkDispatch('virtual fulfillment keeps MiniOrderJob pending before commit', !$transport->jobs);
});
checkDispatch('virtual shipping publication sees committed fulfillment', count($transport->jobs) === 1 && count($dispatch->published) === 1 && $dispatch->published[0]['paid'] === 1 && (int)$worker->table('audit_queue_orders')->value('status') === 1, $dispatch->published);
seedNested();
try { $service->transaction(function () use ($db, $delivery, $orderDao) {
    $db->table('audit_queue_orders')->where('id', 1)->update(['paid' => 1, 'pay_type' => 'weixin', 'virtual_type' => 2]);
    $order = $orderDao->getOne(['id' => 1])->toArray(); $order['cart_id'] = [1]; $delivery->virtualSend($order); throw new RuntimeException('later failure');
}); } catch (RuntimeException $error) {}
checkDispatch('virtual rollback discards shipping job and fulfillment state', !$transport->jobs && (int)$db->table('audit_queue_orders')->value('status') === 0 && $db->table('audit_queue_status')->count() === 0);
seedNested(); putenv('AUDIT_DISPATCH_LISTENER_FAIL=1');
try { $success->paySuccess(['id' => 1], 'yue'); } catch (Throwable $error) {}
putenv('AUDIT_DISPATCH_LISTENER_FAIL');
checkDispatch('failed payment cannot grant cached lottery attempts', $lottery->grants === 0, $lottery->grants);
seedNested(); $success->paySuccess(['id' => 1], 'yue');
checkDispatch('successful payment grants lottery attempts after commit', $lottery->grants === 1 && in_array('lottery', array_column($dispatch->published, 'step'), true));
echo json_encode($checks, JSON_PRETTY_PRINT), "\n";
exit(count(array_filter($checks, function ($check) { return !$check['pass']; })) ? 1 : 0);
