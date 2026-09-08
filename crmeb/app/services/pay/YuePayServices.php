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

namespace app\services\pay;

use app\services\BaseServices;
use app\services\order\OtherOrderServices;
use app\services\order\StoreOrderSuccessServices;
use app\services\user\UserMoneyServices;
use app\services\user\UserServices;
use crmeb\exceptions\ApiException;

/**
 * 余额支付
 * Class YuePayServices
 * @package app\services\pay
 */
class YuePayServices extends BaseServices
{

    /**
     * 订单余额支付
     * @param $order_id
     * @param $uid
     * @return bool
     */
    public function yueOrderPay(array $orderInfo, $uid)
    {
        if (!$orderInfo) {
            throw new ApiException('订单不存在');
        }
        $type = 'pay_product';
        if (isset($orderInfo['member_type'])) {
            $type = 'pay_member';
        }
        $services = app()->make(UserServices::class);
        $orderServices = app()->make($type === 'pay_product' ? StoreOrderSuccessServices::class : OtherOrderServices::class);
        return $this->transaction(function () use ($services, $orderServices, $orderInfo, $uid, $type) {
            // Lock the order before the account for both balance payments and callbacks.
            $currentOrder = $orderServices->getOneForUpdate(['id' => $orderInfo['id']]);
            if (!$currentOrder) throw new ApiException('订单不存在');
            if ($currentOrder['paid']) {
                if ($type === 'pay_product') {
                    $orderServices->paySuccess($currentOrder->toArray(), $currentOrder['pay_type']);
                }
                return ['status' => true];
            }
            $orderInfo = $currentOrder->toArray();
            if (!empty($orderInfo['is_cancel']) || !empty($orderInfo['is_del']) || !empty($orderInfo['is_system_del'])) {
                throw new ApiException('订单已失效');
            }
            $userInfo = $services->getOneForUpdate(['uid' => (int)$uid]);
            if (!$userInfo) throw new ApiException('用户不存在');
            if (bccomp((string)$userInfo['now_money'], (string)$orderInfo['pay_price'], 2) < 0) {
                return ['status' => 'pay_deficiency', 'msg' => '余额不足' . floatval($orderInfo['pay_price'])];
            }
            if ($type === 'pay_product') {
                $orderInfo['pay_uid'] = (int)$uid;
                $orderServices->update($orderInfo['id'], ['pay_uid' => (int)$uid]);
            }
            $res = false !== $services->bcDec($userInfo['uid'], 'now_money', $orderInfo['pay_price'], 'uid');
            /** @var UserMoneyServices $userMoneyServices */
            $userMoneyServices = app()->make(UserMoneyServices::class);
            //写入余额记录
            $now_money = bcsub((string)$userInfo['now_money'], (string)$orderInfo['pay_price'], 2);
            $number = $orderInfo['pay_price'];
            switch ($type) {
                case 'pay_product'://商品余额
                    $res = $res && $userMoneyServices->income('pay_product', $userInfo['uid'], $number, $now_money, $orderInfo['id']);
                    /** @var StoreOrderSuccessServices $orderServices */
                    $orderServices = app()->make(StoreOrderSuccessServices::class);
                    $res = $res && $orderServices->paySuccess($orderInfo, PayServices::YUE_PAY);//余额支付成功
                    break;
                case 'pay_member'://会员卡支付
                    $res = $res && $userMoneyServices->income('pay_member', $userInfo['uid'], $number, $now_money, $orderInfo['id']);
                    /** @var OtherOrderServices $OtherOrderServices */
                    $OtherOrderServices = app()->make(OtherOrderServices::class);
                    $res = $res && $OtherOrderServices->paySuccess($orderInfo, PayServices::YUE_PAY);//余额支付成功
                    break;
            }
            if (!$res) {
                throw new ApiException('余额支付失败');
            }
            return ['status' => true];
        });
    }
}
