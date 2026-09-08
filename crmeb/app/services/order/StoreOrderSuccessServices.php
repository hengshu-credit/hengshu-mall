<?php
// +----------------------------------------------------------------------
// | CRMEB [ CRMEB赋能开发者，助力企业发展 ]
// +----------------------------------------------------------------------
// | Copyright (c) 2016~2026 https://www.crmeb.com All rights reserved.
// +----------------------------------------------------------------------
// | Licensed CRMEB并不是自由软件，未经许可不能去掉CRMEB相关版权
// +----------------------------------------------------------------------
// | Author: CRMEB Team <admin@crmeb.com>
// +----------------------------------------------------------------------

namespace app\services\order;


use app\dao\order\StoreOrderDao;
use app\services\activity\combination\StorePinkServices;
use app\services\BaseServices;
use app\services\pay\PayServices;
use crmeb\exceptions\ApiException;
use crmeb\utils\AfterCommit;

/**
 * Class StoreOrderSuccessServices
 * @package app\services\order
 * @method getOne(array $where, ?string $field = '*', array $with = []) 获取去一条数据
 */
class StoreOrderSuccessServices extends BaseServices
{
    /**
     *
     * StoreOrderSuccessServices constructor.
     * @param StoreOrderDao $dao
     */
    public function __construct(StoreOrderDao $dao)
    {
        $this->dao = $dao;
    }

    /**
     * 0元支付
     * @param array $orderInfo
     * @param int $uid
     * @return bool
     * @throws \think\Exception
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\ModelNotFoundException
     * @throws \think\exception\DbException
     */
    public function zeroYuanPayment(array $orderInfo, int $uid, string $payType = PayServices::YUE_PAY)
    {
        if ($orderInfo['paid']) {
            throw new ApiException('该订单已支付');
        }
        return $this->paySuccess($orderInfo, $payType);//余额支付成功
    }

    /**
     * 支付成功
     * @param array $orderInfo
     * @param string $paytype
     * @param array $other
     * @return bool
     * @throws \Psr\SimpleCache\InvalidArgumentException
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     */
    public function paySuccess(array $orderInfo, string $paytype = PayServices::WEIXIN_PAY, array $other = [])
    {
        return $this->transaction(function () use ($orderInfo, $paytype, $other) {
            $currentOrder = $this->dao->getOneForUpdate(['id' => $orderInfo['id']]);
            if (!$currentOrder) throw new ApiException('订单不存在');
            AfterCommit::defer(function () use ($orderInfo) {
                app()->make(OrderPaymentDispatchServices::class)->flush((int)$orderInfo['id']);
            });
            if ($currentOrder['paid']) return true;
            return $this->completePayment($currentOrder->toArray(), $paytype, $other);
        });
    }

    /** The caller holds the order row lock and transaction until business effects succeed. */
    protected function completePayment(array $orderInfo, string $paytype, array $other)
    {
        $updata = ['paid' => 1, 'pay_type' => $paytype, 'pay_time' => time()];
        $orderInfo['pay_time'] = $updata['pay_time'];
        $orderInfo['pay_type'] = $paytype;
        if ($other && isset($other['trade_no'])) {
            $updata['trade_no'] = $other['trade_no'];
        }
        /** @var StoreOrderCartInfoServices $orderInfoServices */
        $orderInfoServices = app()->make(StoreOrderCartInfoServices::class);
        $orderInfo['storeName'] = $orderInfoServices->getCarIdByProductTitle((int)$orderInfo['id']);
        $res1 = $this->dao->update($orderInfo['id'], $updata);
        if (!$res1) throw new ApiException('订单支付失败');
        $resPink = true;
        if ($orderInfo['combination_id'] && $res1 && !$orderInfo['refund_status']) {
            /** @var StorePinkServices $pinkServices */
            $pinkServices = app()->make(StorePinkServices::class);
            /** @var StoreOrderServices $orderServices */
            $orderServices = app()->make(StoreOrderServices::class);
            $resPink = $pinkServices->createPink($orderServices->tidyOrder($orderInfo, true));//创建拼团
        }
        //缓存抽奖次数 除过线下支付
        if (isset($orderInfo['pay_type']) && $orderInfo['pay_type'] != 'offline') {
            app()->make(OrderPaymentDispatchServices::class)->stage((int)$orderInfo['id'], 'lottery');
        }
        $orderInfo['send_name'] = $orderInfo['real_name'];
        //订单支付成功后置事件
        event('OrderPaySuccessListener', [$orderInfo]);
        foreach (['notice_user', 'notice_admin', 'out_push', 'custom_notice', 'custom_event'] as $step) {
            app()->make(OrderPaymentDispatchServices::class)->stage((int)$orderInfo['id'], $step);
        }

        $res = $res1 && $resPink;
        if (!$res) throw new ApiException('订单支付失败');
        return true;
    }

}
