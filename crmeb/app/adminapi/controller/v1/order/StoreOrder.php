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
namespace app\adminapi\controller\v1\order;

use app\adminapi\controller\AuthController;
use app\adminapi\validate\order\StoreOrderValidate;
use app\jobs\MiniOrderJob;
use app\jobs\OrderExpressJob;
use app\services\serve\ServeServices;
use app\services\wechat\WechatUserServices;
use crmeb\services\FileService;
use app\services\order\{StoreOrderCartInfoServices,
    StoreOrderDeliveryServices,
    StoreOrderRefundServices,
    StoreOrderStatusServices,
    StoreOrderTakeServices,
    StoreOrderWriteOffServices,
    StoreOrderServices
};
use app\services\pay\OrderOfflineServices;
use app\services\shipping\ExpressServices;
use app\services\system\store\SystemStoreServices;
use app\services\user\UserServices;
use think\facade\App;

/**
 * 订单管理
 * Class StoreOrder
 * @package app\adminapi\controller\v1\order
 */
class StoreOrder extends AuthController
{
    /**
     * StoreOrder constructor.
     * @param App $app
     * @param StoreOrderServices $service
     * @method temp
     */
    public function __construct(App $app, StoreOrderServices $service)
    {
        parent::__construct($app);
        $this->services = $service;
    }

    /**
     * 获取订单类型数量
     * @return mixed
     */
    public function chart()
    {
        $where = $this->request->getMore([
            ['data', '', '', 'time'],
            ['type', ''],
            ['pay_type', ''],
            ['field_key', 'all'],
            ['real_name', ''],
        ]);
        $data = $this->services->orderCount($where);
        return app('json')->success($data);
    }

    /**
     * 订单列表
     * @return mixed
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     */
    public function lst()
    {
        $where = $this->request->getMore([
            ['status', ''],
            ['real_name', ''],
            ['is_del', ''],
            ['data', '', '', 'time'],
            ['type', ''],
            ['pay_type', ''],
            ['order', ''],
            ['field_key', ''],
        ]);
        $where['is_system_del'] = 0;
        $where['pid'] = 0;
        if ($where['status'] == 1) $where = $where + ['shipping_type' => 1];
        return app('json')->success($this->services->getOrderList($where, ['*'], ['split' => function ($query) {
            $query->field('id,pid');
        }, 'pink', 'invoice', 'division']));
    }

    /**
     * 核销码核销
     * @param StoreOrderWriteOffServices $services
     * @return mixed
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     */
    public function write_order(StoreOrderWriteOffServices $services)
    {
        [$code, $confirm] = $this->request->getMore([
            ['code', ''],
            ['confirm', 0]
        ], true);
        if (!$code) return app('json')->fail('参数错误');
        $orderInfo = $services->writeOffOrder($code, (int)$confirm);
        if ($confirm == 0) {
            return app('json')->success('验证成功', $orderInfo);
        }
        return app('json')->success('核销成功');
    }

    /**
     * 订单号核销
     * @param StoreOrderWriteOffServices $services
     * @param $order_id
     * @return mixed
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     */
    public function write_update(StoreOrderWriteOffServices $services, $order_id)
    {
        $orderInfo = $this->services->getOne(['order_id' => $order_id, 'is_del' => 0]);
        if ($orderInfo->shipping_type != 2 && $orderInfo->delivery_type != 'send') {
            return app('json')->fail('核销订单未查到');
        } else {
            if (!$orderInfo->verify_code) {
                return app('json')->fail('参数错误');
            }
            $orderInfo = $services->writeOffOrder($orderInfo->verify_code, 1);
            if ($orderInfo) {
                return app('json')->success('验证成功');
            } else {
                return app('json')->fail('核销失败');
            }
        }
    }

    /**
     * 订单改价表单
     * @param $id
     * @return mixed
     * @throws \FormBuilder\Exception\FormBuilderException
     */
    public function edit($id)
    {
        if (!$id) return app('json')->fail('参数错误');
        return app('json')->success($this->services->updateForm($id));
    }

    /**
     * 订单改价
     * @param $id
     * @return mixed
     * @throws \Exception
     */
    public function update($id)
    {
        if (!$id) return app('json')->fail('参数错误');
        $data = $this->request->postMore([
            ['order_id', ''],
            ['total_price', 0],
            ['total_postage', 0],
            ['pay_price', 0],
            ['pay_postage', 0],
            ['gain_integral', 0],
        ]);

        $this->validate($data, StoreOrderValidate::class);

        if ($data['total_price'] < 0) return app('json')->fail('订单金额必须填写');
        if ($data['pay_price'] < 0) return app('json')->fail('订单金额必须填写');

        $this->services->updateOrder((int)$id, $data);
        return app('json')->success('修改成功');
    }

    /**
     * 获取快递公司
     * @return mixed
     */
    public function express(ExpressServices $services)
    {
        [$status] = $this->request->getMore([
            ['status', ''],
        ], true);
        if ($status != '') $data['status'] = $status;
        if ($status == 'undefined') $data['status'] = 1;
        $data['is_show'] = 1;
        return app('json')->success($services->express($data));
    }

    /**
     * 批量删除用户已经删除的订单
     * @return mixed
     */
    public function del_orders()
    {
        [$ids] = $this->request->postMore([
            ['ids', []],
        ], true);
        if (!count($ids)) return app('json')->fail('请选择需要删除的订单');
        if ($this->services->getOrderIdsCount($ids))
            return app('json')->fail('您选择的的订单存在用户未删除的订单');
        if ($this->services->batchUpdate($ids, ['is_system_del' => 1]))
            return app('json')->success('删除成功');
        else
            return app('json')->fail('删除失败');
    }

    /**
     * 删除订单
     * @param $id
     * @return mixed
     */
    public function del($id)
    {
        if (!$id || !($orderInfo = $this->services->get($id)))
            return app('json')->fail('订单不存在');
        if (!$orderInfo->is_del)
            return app('json')->fail('您选择的的订单存在用户未删除的订单');
        $orderInfo->is_system_del = 1;
        if ($orderInfo->save()) {
            /** @var StoreOrderRefundServices $refundServices */
            $refundServices = app()->make(StoreOrderRefundServices::class);
            $refundServices->update(['store_order_id' => $id], ['is_system_del' => 1]);
            return app('json')->success('删除成功');
        } else
            return app('json')->fail('删除失败');
    }

    /**
     * 订单发送货
     * @param $id
     * @param StoreOrderDeliveryServices $services
     * @return mixed
     */
    public function update_delivery($id, StoreOrderDeliveryServices $services)
    {
        $data = $this->request->postMore([
            ['type', 1],
            ['delivery_name', ''],//快递公司名称
            ['delivery_id', ''],//快递单号
            ['delivery_code', ''],//快递公司编码

            ['express_record_type', 2],//发货记录类型:2=电子面单；3=商家寄件
            ['express_temp_id', ""],//电子面单模板
            ['to_name', ''],//寄件人姓名
            ['to_tel', ''],//寄件人电话
            ['to_addr', ''],//寄件人地址

            ['sh_delivery_name', ''],//送货人姓名
            ['sh_delivery_id', ''],//送货人电话
            ['sh_delivery_uid', ''],//送货人ID

            ['fictitious_content', ''],//虚拟发货内容

            ['day_type', 0], //顺丰传 0今天，1明天，2后台
            ['pickup_time', []],//开始时间 9:00，结束时间 10:00  开始时间和结束时间之间不能小于一个小时
        ]);
        return app('json')->success('操作成功', $services->delivery((int)$id, $data));
    }

    /**
     * 订单拆单发送货
     * @param $id
     * @param StoreOrderDeliveryServices $services
     * @return mixed
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     */
    public function split_delivery($id, StoreOrderDeliveryServices $services)
    {
        $data = $this->request->postMore([
            ['type', 1],
            ['delivery_name', ''],//快递公司名称
            ['delivery_id', ''],//快递单号
            ['delivery_code', ''],//快递公司编码

            ['express_record_type', 2],//发货记录类型
            ['express_temp_id', ""],//电子面单模板
            ['to_name', ''],//寄件人姓名
            ['to_tel', ''],//寄件人电话
            ['to_addr', ''],//寄件人地址

            ['sh_delivery_name', ''],//送货人姓名
            ['sh_delivery_id', ''],//送货人电话
            ['sh_delivery_uid', ''],//送货人ID

            ['fictitious_content', ''],//虚拟发货内容

            ['cart_ids', []],

            ['day_type', 0], //顺丰传 0今天，1明天，2后台
            ['pickup_time', []],//开始时间 9:00，结束时间 10:00  开始时间和结束时间之间不能小于一个小时
            ['service_type', ''],//快递业务类型
        ]);
        if (!$id) {
            return app('json')->fail('参数错误');
        }
        if (!$data['cart_ids']) {
            return app('json')->fail('请选择发货商品');
        }
        foreach ($data['cart_ids'] as $cart) {
            if (!isset($cart['cart_id']) || !$cart['cart_id'] || !isset($cart['cart_num']) || !$cart['cart_num']) {
                return app('json')->fail('请重新选择发货商品或发货件数');
            }
        }
        return app('json')->success('操作成功', $services->splitDelivery((int)$id, $data));
    }

    /**
     * 获取寄件预扣金额
     * @param ServeServices $services
     * @return \think\Response
     * @author 等风来
     * @email 136327134@qq.com
     * @date 2023/6/16
     */
    public function getPrice(ServeServices $services)
    {
        $data = $this->request->postMore([
            ['kuaidicom', ''],
            ['send_address', ''],
            ['orderId', ''],
            ['service_type', ''],
            ['cart_ids', []],
        ]);

        $orderInfo = $this->services->get($data['orderId'], ['user_address', 'cart_id']);
        if (!$orderInfo) {
            return app('json')->fail('订单没有查询到');
        }
        $weight = '0';
        if ($data['cart_ids']) {
            $cartIds = array_column($data['cart_ids'], 'cart_id');
            $cartList = app()->make(StoreOrderCartInfoServices::class)->getColumn([
                ['cart_id', 'in', $cartIds]
            ], 'cart_info', 'cart_id');
            foreach ($data['cart_ids'] as $cart) {
                if (!isset($cart['cart_id']) || !$cart['cart_id'] || !isset($cart['cart_num']) || !$cart['cart_num']) {
                    return app('json')->fail('请重新选择发货商品或发货件数');
                }
                if (isset($cartList[$cart['cart_id']])) {
                    $value = is_string($cartList[$cart['cart_id']]) ? json_decode($cartList[$cart['cart_id']], true) : $cartList[$cart['cart_id']];
                    $weightnew = bcmul($value['attrInfo']['weight'], (string)$cart['cart_num'], 2);
                    $weight = bcadd($weightnew, $weight, 2);
                }
            }
        } else {
            $orderCartInfoList = app()->make(StoreOrderCartInfoServices::class)->getCartInfoPrintProduct($data['orderId']);
            foreach ($orderCartInfoList as $item) {
                $weightnew = bcmul($item['attrInfo']['weight'], (string)$item['cart_num'], 2);
                $weight = bcadd($weightnew, $weight, 2);
            }
        }
        $data['address'] = $orderInfo['user_address'];
        if ($weight > 0) {
            $data['weight'] = $weight;
        }
        return app('json')->success($services->express()->getPrice($data));
    }

    /**
     * 获取订单可拆分发货商品列表
     * @param $id
     * @param StoreOrderCartInfoServices $services
     * @return mixed
     */
    public function split_cart_info($id, StoreOrderCartInfoServices $services)
    {
        if (!$id) {
            return app('json')->fail('参数错误');
        }
        return app('json')->success($services->getSplitCartList((int)$id));
    }

    /**
     * 获取订单拆分子订单列表
     * @param $id
     * @return mixed
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     */
    public function split_order($id)
    {
        if (!$id) {
            return app('json')->fail('参数错误');
        }
        return app('json')->success($this->services->getSplitOrderList(['pid' => $id, 'is_system_del' => 0], ['*'], ['split', 'pink', 'invoice']));
    }


    /**
     * 确认收货
     * @param $id 订单id
     * @return mixed
     * @throws \Exception
     */
    public function take_delivery(StoreOrderTakeServices $services, $id)
    {
        if (!$id) return app('json')->fail('参数错误');
        $order = $this->services->get($id);
        if (!$order)
            return app('json')->fail('订单不存在');
        if ($order['status'] == 2)
            return app('json')->fail('不能重复收货');
        if ($order['paid'] == 1 && $order['status'] == 1)
            $data['status'] = 2;
        else if ($order['pay_type'] == 'offline')
            $data['status'] = 2;
        else
            return app('json')->fail('请先发货或者送货');

        if (!$this->services->update($id, $data)) {
            return app('json')->fail('收货失败,请稍候再试');
        } else {
            $services->storeProductOrderUserTakeDelivery($order);
            return app('json')->success('收货成功');
        }
    }


    /**
     * 获取配置信息
     * @return mixed
     */
    public function getDeliveryInfo()
    {
        return app('json')->success([
            'express_temp_id' => sys_config('config_export_temp_id'),
            'id' => sys_config('config_export_id'),
            'to_name' => sys_config('config_export_to_name'),
            'to_tel' => sys_config('config_export_to_tel'),
            'to_add' => sys_config('config_export_to_address'),
            'export_open' => (bool)((int)sys_config('config_export_open'))
        ]);
    }

    /**
     * 退款表单生成
     * @param $id 订单id
     * @return mixed
     * @throws \FormBuilder\Exception\FormBuilderException
     */
    public function refund(StoreOrderRefundServices $services, $id)
    {
        if (!$id) {
            return app('json')->fail('参数错误');
        }
        return app('json')->success($services->refundOrderForm((int)$id, 'order'));
    }

    /**
     * 订单退款
     * @param $id 订单id
     * @return mixed
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\ModelNotFoundException
     * @throws \think\exception\DbException
     */
    public function update_refund(StoreOrderRefundServices $services, $id)
    {
        $data = $this->request->postMore([
            ['refund_price', 0],
            ['cart_ids', []]
        ]);
        if (!$id) {
            return app('json')->fail('参数错误');
        }
        $order = $this->services->get($id);
        if (!$order) {
            return app('json')->fail('订单不存在');
        }

        $refundData = [
            'refund_reason' => '后台主动退款',
            'refund_explain' => '后台主动退款',
            'refund_img' => json_encode([]),
        ];

        $res = $services->applyRefund((int)$id, $order['uid'], $order, $data['cart_ids'], 1, (float)$data['refund_price'], $refundData);

        if (!$res) {
            return app('json')->fail('退款单生成失败');
        }

        $orderRefund = $services->getOrderOne(['store_order_id' => $id]);


        $data['refund_status'] = 2;
        $data['refund_type'] = 6;
        $data['refunded_time'] = time();

        //0元退款
        if ($orderRefund['refund_price'] == 0 && in_array($orderRefund['refund_type'], [1, 5])) {
            $refund_price = 0;
        } else {
            if (!$data['refund_price']) {
                return app('json')->fail('请输入退款金额');
            }
            if ($orderRefund['refund_price'] == $orderRefund['refunded_price']) {
                return app('json')->fail('已退完支付金额，不能再退款了');
            }
            $refund_price = $data['refund_price'];
        }

        $data['refunded_price'] = bcadd($data['refund_price'], $orderRefund['refunded_price'], 2);
        $bj = bccomp((string)$orderRefund['refund_price'], (string)$data['refunded_price'], 2);
        if ($bj < 0) {
            return app('json')->fail('退款金额大于支付金额，请修改退款金额');
        }

        $refund_data['pay_price'] = $order['pay_price'];
        $refund_data['refund_price'] = $refund_price;
        if ($order['refund_price'] > 0) {
            mt_srand();
            $refund_data['refund_id'] = $order['order_id'] . rand(100, 999);
        }
        ($order['pid'] > 0) ? $refund_data['order_id'] = $this->services->value(['id' => (int)$order['pid']], 'order_id') : $refund_data['order_id'] = $order['order_id'];
        /** @var WechatUserServices $wechatUserServices */
        $wechatUserServices = app()->make(WechatUserServices::class);
        $refund_data['open_id'] = $wechatUserServices->uidToOpenid((int)$order['uid'], 'routine') ?? '';
        $refund_data['refund_no'] = $orderRefund['order_id'];
        $refund_data['order_id'] = $orderRefund['order_id'];
        //修改订单退款状态
        unset($data['refund_price']);
        if ($services->agreeRefund($orderRefund['id'], $refund_data)) {
            $services->update($orderRefund['id'], $data);
            return app('json')->success('退款成功');
        } else {
            $services->storeProductOrderRefundYFasle((int)$orderRefund['id'], $refund_price);
            return app('json')->fail('退款失败');
        }
    }

    /**
     * 订单详情
     * @param $id 订单id
     * @return mixed
     * @throws \ReflectionException
     */
    public function order_info($id)
    {
        if (!$id || !($orderInfo = $this->services->get($id, [], ['refund', 'invoice']))) {
            return app('json')->fail('订单不存在');
        }
        /** @var UserServices $services */
        $services = app()->make(UserServices::class);
        $userInfo = $services->get($orderInfo['uid']);
        if (!$userInfo) return app('json')->fail('用户信息不存在');
        $userInfo = $userInfo->hidden(['pwd', 'add_ip', 'last_ip', 'login_type']);
        $userInfo['spread_name'] = '无';
        if ($userInfo['spread_uid']) {
            $spreadName = $services->value(['uid' => $userInfo['spread_uid']], 'nickname');
            if ($spreadName) {
                $userInfo['spread_name'] = $spreadName;
            } else {
                $userInfo['spread_uid'] = '';
            }
        } else {
            $userInfo['spread_uid'] = '';
        }

        $orderInfo = $this->services->tidyOrder($orderInfo->toArray(), true, true);
        //核算优惠金额
        $vipTruePrice = $levelPrice = $memberPrice = 0;
        foreach ($orderInfo['cartInfo'] as $cart) {
            $vipTruePrice = bcadd((string)$vipTruePrice, (string)$cart['vip_sum_truePrice'], 2);
            if ($cart['price_type'] == 'member') $memberPrice = bcadd((string)$memberPrice, (string)$cart['vip_sum_truePrice'], 2);
            if ($cart['price_type'] == 'level') $levelPrice = bcadd((string)$levelPrice, (string)$cart['vip_sum_truePrice'], 2);
        }
        $orderInfo['vip_true_price'] = $vipTruePrice;
        $orderInfo['levelPrice'] = $levelPrice;
        $orderInfo['memberPrice'] = $memberPrice;
        $orderInfo['total_price'] = bcadd($orderInfo['total_price'], $orderInfo['vip_true_price'], 2);
        if ($orderInfo['store_id'] && $orderInfo['shipping_type'] == 2) {
            /** @var  $storeServices */
            $storeServices = app()->make(SystemStoreServices::class);
            $orderInfo['_store_name'] = $storeServices->value(['id' => $orderInfo['store_id']], 'name');
        } else
            $orderInfo['_store_name'] = '';
        $orderInfo['spread_name'] = $services->value(['uid' => $orderInfo['spread_uid']], 'nickname') ?? '无';
        $orderInfo['_info'] = app()->make(StoreOrderCartInfoServices::class)->getOrderCartInfo((int)$orderInfo['id']);
        $cart_num = 0;
        $refund_num = array_sum(array_column($orderInfo['refund'], 'refund_num'));
        foreach ($orderInfo['_info'] as $items) {
            $cart_num += $items['cart_info']['cart_num'];
        }
        $orderInfo['is_all_refund'] = $refund_num == $cart_num;
        $userInfo = $userInfo->toArray();
        return app('json')->success(compact('orderInfo', 'userInfo'));
    }

    /**
     * 查询物流信息
     * @param $id 订单id
     * @return mixed
     */
    public function get_express($id, ExpressServices $services)
    {
        if (!$id || !($orderInfo = $this->services->get($id)))
            return app('json')->fail('订单不存在');
        if ($orderInfo['delivery_type'] != 'express' || !$orderInfo['delivery_id'])
            return app('json')->fail('快递单号不存在');

        $cacheName = $orderInfo['order_id'] . $orderInfo['delivery_id'];

        $data['delivery_name'] = $orderInfo['delivery_name'];
        $data['delivery_id'] = $orderInfo['delivery_id'];
        $data['result'] = $services->query($cacheName, $orderInfo['delivery_id'], $orderInfo['delivery_code'] ?? null, $orderInfo['user_phone']);
        return app('json')->success($data);
    }


    /**
     * 获取修改配送信息表单结构
     * @param $id 订单id
     * @return mixed
     * @throws \FormBuilder\Exception\FormBuilderException
     */
    public function distribution(StoreOrderDeliveryServices $services, $id)
    {
        if (!$id) {
            return app('json')->fail('参数错误');
        }
        return app('json')->success($services->distributionForm((int)$id));
    }

    /**
     * 修改配送信息
     * @param $id  订单id
     * @return mixed
     */
    public function update_distribution(StoreOrderDeliveryServices $services, $id)
    {
        $data = $this->request->postMore([['delivery_name', ''], ['delivery_code', ''], ['delivery_id', '']]);
        if (!$id) return app('json')->fail('参数错误');
        $services->updateDistribution($id, $data);
        return app('json')->success('操作成功');
    }

    /**
     * 不退款表单结构
     * @param StoreOrderRefundServices $services
     * @param $id
     * @return mixed
     * @throws \FormBuilder\Exception\FormBuilderException
     */
    public function no_refund(StoreOrderRefundServices $services, $id)
    {
        if (!$id) return app('json')->fail('参数错误');
        return app('json')->success($services->noRefundForm((int)$id));
    }

    /**
     * 订单不退款
     * @param StoreOrderRefundServices $services
     * @param $id
     * @return mixed
     */
    public function update_un_refund(StoreOrderRefundServices $services, $id)
    {
        if (!$id || !($orderInfo = $this->services->get($id)))
            return app('json')->fail('订单不存在');
        [$refund_reason] = $this->request->postMore([['refund_reason', '']], true);
        if (!$refund_reason) {
            return app('json')->fail('拒绝理由不能为空');
        }
        $orderInfo->refund_reason = $refund_reason;
        $orderInfo->refund_status = 0;
        $orderInfo->refund_type = 3;
        $orderInfo->save();
        if ($orderInfo->pid > 0) {
            $res1 = $this->services->getCount([
                ['pid', '=', $orderInfo->pid],
                ['refund_type', '>', 0],
                ['refund_type', '<>', 3],
            ]);
            if ($res1 == 0) {
                $this->services->update($orderInfo->pid, ['refund_status' => 0]);
            }
        }
        $services->storeProductOrderRefundNo((int)$id, $refund_reason);
        //提醒推送
        event('NoticeListener', [['orderInfo' => $orderInfo], 'send_order_refund_no_status']);

        //自定义消息-订单拒绝退款
        $orderInfo['time'] = date('Y-m-d H:i:s');
        $orderInfo['phone'] = $orderInfo['user_phone'];
        event('CustomNoticeListener', [$orderInfo['uid'], $orderInfo, 'order_refund_fail']);

        return app('json')->success('操作成功');
    }

    /**
     * 线下支付
     * @param $id 订单id
     * @return mixed
     */
    public function pay_offline(OrderOfflineServices $services, $id)
    {
        if (!$id) return app('json')->fail('参数错误');
        $res = $services->orderOffline((int)$id);
        if ($res) {
            return app('json')->success('操作成功');
        } else {
            return app('json')->fail('操作失败');
        }
    }

    /**
     * 退积分表单获取
     * @param $id
     * @return mixed
     * @throws \FormBuilder\Exception\FormBuilderException
     */
    public function refund_integral(StoreOrderRefundServices $services, $id)
    {
        if (!$id)
            return app('json')->fail('参数错误');
        return app('json')->success($services->refundIntegralForm((int)$id));
    }

    /**
     * 退积分保存
     * @param $id
     * @return mixed
     */
    public function update_refund_integral(StoreOrderRefundServices $services, $id)
    {
        [$back_integral] = $this->request->postMore([['back_integral', 0]], true);
        if (!$id || !($orderInfo = $this->services->get($id))) {
            return app('json')->fail('订单不存在');
        }
        if ($orderInfo->is_del) {
            return app('json')->fail('订单已删除无法退积分');
        }
        if ($back_integral <= 0) {
            return app('json')->fail('请输入积分');
        }
        if ($orderInfo['use_integral'] == $orderInfo['back_integral']) {
            return app('json')->fail('已退完积分');
        }

        $data['back_integral'] = bcadd((string)$back_integral, (string)$orderInfo['back_integral'], 2);
        $bj = bccomp((string)$orderInfo['use_integral'], (string)$data['back_integral'], 2);
        if ($bj < 0) {
            return app('json')->fail('退积分大于支付积分，请修改退积分');
        }
        //积分退款处理
        $orderInfo->back_integral = $data['back_integral'];
        if ($services->refundIntegral($orderInfo, $back_integral)) {
            return app('json')->success('退积分成功');
        } else {
            return app('json')->fail('退积分失败');
        }
    }

    /**
     * 修改备注
     * @param $id
     * @return mixed
     */
    public function remark($id)
    {
        $data = $this->request->postMore([['remark', '']]);
        if (!$data['remark'])
            return app('json')->fail('备注不能为空');
        if (!$id)
            return app('json')->fail('参数错误');

        if (!$order = $this->services->get($id)) {
            return app('json')->fail('订单不存在');
        }
        $order->remark = $data['remark'];
        if ($order->save()) {
            return app('json')->success('备注成功');
        } else
            return app('json')->fail('备注失败');
    }

    /**
     * 获取订单状态列表并分页
     * @param $id
     * @return mixed
     */
    public function status(StoreOrderStatusServices $services, $id)
    {
        if (!$id) return app('json')->fail('参数错误');
        return app('json')->success($services->getStatusList(['oid' => $id])['list']);
    }

    /**
     * 小票打印机打印
     * @param $id
     * @return mixed
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     */
    public function order_print($id)
    {
        if (!$id) return app('json')->fail('参数错误');
        $res = $this->services->orderPrintTicket($id, true);
        if ($res) {
            return app('json')->success('操作成功');
        } else {
            return app('json')->fail('操作失败');
        }
    }

    /**
     * 电子面单模板
     * @param $com
     * @return mixed
     */
    public function expr_temp(ServeServices $services, $com)
    {
        if (!$com) {
            return app('json')->fail('快递公司编号缺失');
        }
        $list = $services->express()->temp($com);
        return app('json')->success($list);
    }

    /**
     * 获取模板
     */
    public function express_temp(ServeServices $services)
    {
        $data = $this->request->getMore([['com', '']]);
        if (!$data['com']) {
            return app('json')->fail('快递公司编号缺失');
        }
        $tpd = $services->express()->temp($data['com']);
        return app('json')->success($tpd['data']);
    }

    /**
     * 订单发货后打印电子面单
     * @param $orderId
     * @param StoreOrderDeliveryServices $storeOrderDeliveryServices
     * @return mixed
     */
    public function order_dump($order_id, StoreOrderDeliveryServices $storeOrderDeliveryServices)
    {
        $storeOrderDeliveryServices->orderDump($order_id);
        return app('json')->success('打印成功');
    }

    /**
     * 获取快递信息
     * @param ServeServices $services
     * @return \think\Response
     * @author 等风来
     * @email 136327134@qq.com
     * @date 2023/5/15
     */
    public function getKuaidiComs(ServeServices $services)
    {
        MiniOrderJob::dispatch('syncOrderShipping');
        return app('json')->success($services->express()->getKuaidiComs());
    }

    /**
     * 取消商家寄件
     * @param $id
     * @return \think\Response
     * @author 等风来
     * @email 136327134@qq.com
     * @date 2023/5/15
     */
    public function shipmentCancelOrder($id)
    {
        if (!$id) {
            return app('json')->fail('缺少参数');
        }

        $msg = $this->request->post('msg', '');
        if (!$msg) {
            return app('json')->fail('请填写取消寄件原因');
        }
        if ($this->services->shipmentCancelOrder((int)$id, $msg)) {
            return app('json')->success('取消成功');
        } else {
            return app('json')->fail('取消失败');
        }
    }

    /**
     * 导入批量发货
     * @return \think\Response|void
     * @throws \PhpOffice\PhpSpreadsheet\Reader\Exception
     */
    public function importExpress()
    {
        [$file] = $this->request->getMore([
            ['file', '']
        ], true);
        if (!$file) return app('json')->fail('请上传文件');
        $file = public_path() . substr($file, 1);
        // 获取文件后缀
        $suffix = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        if (!in_array($suffix, ['xls', 'xlsx'])) {
            return app('json')->fail('文件格式不正确，请上传xls或xlsx格式的文件！');
        }
        $expressData = app()->make(FileService::class)->readExcel($file, 'express', 2, ucfirst($suffix));
        foreach ($expressData as $item) {
            OrderExpressJob::dispatch([$item]);
        }
        return app('json')->success('批量发货成功');
    }

    /**
     * 配货单
     * @param $order_id
     * @return \think\Response
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     * @author: 吴汐
     * @email: 442384644@qq.com
     * @date: 2023/10/11
     */
    public function printShipping($order_id)
    {
        if (!$order_id) {
            return app('json')->fail('参数错误');
        }
        $data = $this->services->printShippingData($order_id);
        return app('json')->success($data);
    }

    /**
     * 修改收货地址
     * @param $id
     * @return \think\Response
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/9/8
     */
    public function editAddress($id)
    {
        if (!$id) return app('json')->fail('参数错误');
        $data = $this->request->postMore([
            ['real_name', ''],
            ['user_phone', ''],
            ['user_address', '']
        ]);
        if (!$data['real_name']) return app('json')->fail('请填写收货人姓名');
        if (!$data['user_phone']) return app('json')->fail('请填写收货人电话');
        if (!$data['user_address']) return app('json')->fail('请填写收货人地址');
        $this->services->editAddress($id, $data);
        return app('json')->success('修改成功');
    }
}
