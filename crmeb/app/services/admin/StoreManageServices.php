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
namespace app\services\admin;

use app\services\activity\coupon\StoreCouponIssueServices;
use app\services\activity\coupon\StoreCouponUserServices;
use app\services\BaseServices;
use app\services\order\StoreOrderCreateServices;
use app\services\order\StoreOrderRefundServices;
use app\services\order\StoreOrderServices;
use app\services\product\product\StoreCategoryServices;
use app\services\product\product\StoreProductLabelServices;
use app\services\product\product\StoreProductServices;
use app\services\product\sku\StoreProductAttrValueServices;
use app\services\system\SystemUserLevelServices;
use app\services\user\UserLabelRelationServices;
use app\services\user\UserBillServices;
use app\services\user\UserGroupServices;
use app\services\user\UserLabelCateServices;
use app\services\user\UserMoneyServices;
use app\services\user\UserRechargeServices;
use app\services\user\UserServices;
use app\services\user\UserVisitServices;
use crmeb\exceptions\ApiException;

class StoreManageServices extends BaseServices
{
    /**
     * 商家统计
     * @return array
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/11/13
     */
    public function statistics()
    {
        $storeOrderServices = app()->make(StoreOrderServices::class);
        $userVisitServices = app()->make(UserVisitServices::class);
        $storeOrderRefundServices = app()->make(StoreOrderRefundServices::class);
        $storeProductServices = app()->make(StoreProductServices::class);
        // 今日订单金额，去除用户取消，删除的订单，并且是已支付的订单
        $todayOrderPrice = $storeOrderServices->sum([
            ['add_time', '>', strtotime(date('Y-m-d'))],
            ['is_del', '=', 0],
            ['is_cancel', '=', 0],
            ['paid', '=', 1],
            ['pid', '>=', 0],
        ], 'pay_price', false);
        // 今日订单总数，去除用户取消，删除的订单
        $todayOrderCount = $storeOrderServices->count([
            ['add_time', '>', strtotime(date('Y-m-d'))],
            ['is_del', '=', 0],
            ['is_cancel', '=', 0],
            ['pid', '>=', 0],
        ]);
        // 今日支付人数，去除用户取消，删除的订单，并且是已支付的订单，去重
        $todayOrderUserCount = $storeOrderServices->getDistinctCount([
            ['add_time', '>', strtotime(date('Y-m-d'))],
            ['is_del', '=', 0],
            ['is_cancel', '=', 0],
            ['paid', '=', 1],
            ['pid', '<=', 0],
        ], 'uid', false);
        // 今日浏览量
        $todayVisitCount = $userVisitServices->count([['add_time', '>', strtotime(date('Y-m-d'))]]);
        // 待发货的订单数量，全部时间
        $unDeliveryOrderCount = $storeOrderServices->count(['status' => 1, 'shipping_type' => 1, 'pid' => 0]);
        // 今日退款申请数量，全部时间
        $refundingCount = $storeOrderRefundServices->count(['is_cancel' => 0, 'refund_type' => [1, 2, 4, 5]]);
        // 已售罄的商品数量
        $outOfStock = $storeProductServices->getCount(['type' => 4]);
        // 警戒库存商品数量
        $policeForce = $storeProductServices->getCount(['type' => 5, 'store_stock' => sys_config('store_stock') > 0 ? sys_config('store_stock') : 2]);
        return compact('todayOrderCount', 'todayOrderPrice', 'todayOrderUserCount', 'todayVisitCount', 'unDeliveryOrderCount', 'refundingCount', 'outOfStock', 'policeForce');
    }

    /**
     * 商品列表
     * @param $where
     * @return array
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/11/13
     */
    public function product($where)
    {
        $storeProductServices = app()->make(StoreProductServices::class);
        $where['is_del'] = 0;
        return $storeProductServices->getList($where);
    }

    /**
     * 商品上下架
     * @param $id
     * @param $isShow
     * @return bool
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/11/13
     */
    public function productShow($id, $isShow)
    {
        $storeProductServices = app()->make(StoreProductServices::class);
        $del = $storeProductServices->value(['id' => $id], 'is_del');
        if ($del == 1) throw new ApiException('商品已删除');
        $storeProductServices->setShow([$id], $isShow);
        return true;
    }

    /**
     * 商品标签列表
     * @return array
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/11/13
     */
    public function productLabel()
    {
        $storeProductLabelServices = app()->make(StoreProductLabelServices::class);
        return $storeProductLabelServices->labelUseList();
    }

    /**
     * 商品标签保存
     * @param $ids
     * @param $label_list
     * @return bool
     * @throws \Exception
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/11/13
     */
    public function saveProductLabel($ids, $label_list)
    {
        $data['ids'] = $ids;
        $data['label_list'] = $label_list;
        $data['type'] = 9;
        $storeProductServices = app()->make(StoreProductServices::class);
        $storeProductServices->batchSetting($data);
        return true;
    }

    /**
     * 商品分类列表
     * @return array
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/11/13
     */
    public function productCate()
    {
        $storeCategoryServices = app()->make(StoreCategoryServices::class);
        return $storeCategoryServices->cascaderList(1, 1);
    }

    /**
     * 商品分类保存
     * @param $ids
     * @param $cate_id
     * @return bool
     * @throws \Exception
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/11/13
     */
    public function saveProductCate($ids, $cate_id)
    {
        $data['ids'] = $ids;
        $data['cate_id'] = $cate_id;
        $data['type'] = 1;
        $storeProductServices = app()->make(StoreProductServices::class);
        $storeProductServices->batchSetting($data);
        return true;
    }

    /**
     * 商品属性
     * @param $id
     * @return array
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/11/13
     */
    public function productAttr($id)
    {
        $storeProductAttrValueServices = app()->make(StoreProductAttrValueServices::class);
        return $storeProductAttrValueServices->selectList(['product_id' => $id, 'type' => 0])->toArray();
    }

    /**
     * 商品属性保存
     * @param $id
     * @param $attr_value
     * @return bool|\think\Response
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/11/13
     */
    public function saveProductAttr($id, $attr_value)
    {
        $storeProductServices = app()->make(StoreProductServices::class);
        $storeProductAttrValueServices = app()->make(StoreProductAttrValueServices::class);

        if (!$id) {
            return app('json')->fail('请选择商品');
        }
        if (!$attr_value) {
            return app('json')->fail('请填写属性值');
        }

        //判断规格的属性值是否存在
        $requiredKeys = ['unique', 'price', 'stock', 'cost', 'ot_price'];
        foreach ($attr_value as $attr) {
            $missingKeys = array_diff($requiredKeys, array_keys($attr));
            if (!empty($missingKeys)) {
                throw new ApiException('请重新修改规格库存');
            }
        }

        $product_stock = $product_price = $product_ot_price = $product_cost = 0;
        $attrs = $storeProductAttrValueServices->selectList(['product_id' => $id, 'type' => 0])->toArray();
        $attr_value = array_combine(array_column($attr_value, 'unique'), $attr_value);
        foreach ($attrs as $item) {
            $attr = $attr_value[$item['unique']] ?? [];
            if ($attr) {
                $storeProductAttrValueServices->update($item['id'], [
                    'price' => $attr['price'],
                    'stock' => $attr['stock'],
                    'cost' => $attr['cost'],
                    'ot_price' => $attr['ot_price']
                ]);
            }

            $product_array = $attr ?: $item;
            // 计算商品库存
            $product_stock = bcadd((string)$product_stock, (string)$product_array['stock'], 0);
            // 更新商品价格
            $product_price = max($product_price, $product_array['price']);
            // 更新商品原价
            $product_ot_price = max($product_ot_price, $product_array['ot_price']);
            // 更新商品成本
            $product_cost = max($product_cost, $product_array['cost']);
        }
        // 修改商品库存等信息
        $storeProductServices->update($id, [
            'stock' => $product_stock,
            'price' => $product_price,
            'ot_price' => $product_ot_price,
            'cost' => $product_cost,
        ]);
        return true;
    }

    /**
     * 商品创建
     * @param $data
     * @return bool
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/12/9
     */
    public function createProduct($data)
    {
        $data['attr']['brokerage'] = 0;
        $data['attr']['brokerage_two'] = 0;
        $data['attr']['vip_price'] = 0;
        $data['attr']['virtual_list'] = [];
        $data['attr']['coupon_id'] = 0;
        $saveData = [
            'virtual_type' => 0,
            'cate_id' => $data['cate_id'],
            'store_name' => $data['store_name'],
            'keyword' => '',
            'unit_name' => $data['unit_name'],
            'store_info' => '',
            'slider_image' => $data['slider_image'],
            'video_open' => 0,
            'video_link' => '',
            'spec_type' => 0,
            'items' => [],
            'attrs' => [$data['attr']],
            'description' => $data['content'],
            'description_images' => [],
            'logistics' => $data['logistics'],
            'freight' => $data['freight'],
            'postage' => $data['postage'],
            'temp_id' => $data['temp_id'],
            'give_integral' => 0,
            'presale' => 0,
            'presale_time' => 0,
            'presale_day' => 1,
            'vip_product' => 0,
            'vip_product_type' => 0,
            'is_sub' => [],
            'recommend' => [],
            'activity' => ['默认', '秒杀', '砍价', '拼团'],
            'recommend_list' => [],
            'coupon_ids' => [],
            'label_id' => [],
            'command_word' => '',
            'is_show' => 0,
            'ficti' => 0,
            'sort' => 0,
            'recommend_image' => '',
            'sales' => 0,
            'custom_form' => [],
            'type' => 0,
            'is_copy' => 0,
            'is_limit' => 0,
            'limit_type' => 0,
            'limit_num' => 0,
            'min_qty' => 1,
            'params_list' => [],
            'label_list' => [],
            'protection_list' => [],
            'is_gift' => 0,
            'gift_price' => 0,
        ];
        $storeProductServices = app()->make(StoreProductServices::class);
        $storeProductServices->save(0, $saveData);
        return true;
    }

    /**
     * 用户列表
     * @param $where
     * @return array
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/11/17
     */
    public function user($where)
    {
        $userServices = app()->make(UserServices::class);
        return $userServices->index($where);
    }

    /**
     * 用户信息详情
     * @param $uid
     * @return mixed
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/11/17
     */
    public function userInfo($uid)
    {
        $userServices = app()->make(UserServices::class);
        $userInfo = $userServices->get($uid);
        if (!$userInfo) throw new ApiException('用户不存在');
        $userInfo = $userInfo->toArray();
        $userInfo['avatar'] = set_file_url($userInfo['avatar']);
        $userInfo['birthday'] = $userInfo['birthday'] != 0 ? date('Y-m-d', $userInfo['birthday']) : '';
        // 优惠券数量
        $userInfo['coupon_num'] = app()->make(StoreCouponUserServices::class)->getUserValidCouponCount((int)$uid);
        // 用户标签
        $label_list = app()->make(UserLabelRelationServices::class)->getUserLabelList([$uid]);
        $label_id = [];
        $userInfo['label_list'] = '';
        if ($label_list) {
            $userInfo['label_list'] = implode(',', array_column($label_list, 'label_name'));
            foreach ($label_list as $item) {
                $label_id[] = [
                    'id' => $item['label_id'],
                    'label_name' => $item['label_name']
                ];
            }
        }
        $userInfo['label_id'] = $label_id;
        // 用户订单金额及数量
        $orderServices = app()->make(StoreOrderServices::class);
        $userInfo['order_total_price'] = $orderServices->sum(['uid' => $uid, 'paid' => 1, 'refund_status' => 0], 'pay_price');
        $userInfo['order_total_count'] = $orderServices->count(['uid' => $uid, 'paid' => 1, 'refund_status' => 0]);
        // 会员
        $userInfo['isMember'] = $userInfo['is_money_level'] > 0 ? 1 : 0;
        if ($userInfo['is_ever_level'] == 1) {
            $userInfo['svip_overdue_time'] = $userInfo['svip_over_day'] = '永久';
        } else {
            if ($userInfo['is_money_level'] > 0 && $userInfo['overdue_time'] > 0) {
                $userInfo['svip_over_day'] = ceil(($userInfo['overdue_time'] - time()) / 86400);
                $userInfo['svip_overdue_time'] = date('Y-m-d', $userInfo['overdue_time']);
            }
        }
        return $userInfo;
    }

    /**
     * 用户分组
     * @return array
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/11/17
     */
    public function userGroup()
    {
        $userGroupServices = app()->make(UserGroupServices::class);
        return $userGroupServices->getGroupList();
    }

    /**
     * 用户等级
     * @return array
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/11/17
     */
    public function userLevel()
    {
        $systemUserLevelServices = app()->make(SystemUserLevelServices::class);
        return $systemUserLevelServices->getLevelList([], 'id,name,icon,image');
    }

    /**
     * 用户标签
     * @param $uid
     * @return array
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/11/17
     */
    public function userLabel($uid)
    {
        $userLabelCateServices = app()->make(UserLabelCateServices::class);
        return $userLabelCateServices->getUserLabel($uid);
    }

    /**
     * 用户优惠券
     * @param $where
     * @return mixed
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/11/17
     */
    public function userCoupon($where)
    {
        if ($where['uid'] == 0) {
            $page = $where['page'] ?? 1;
            $limit = $where['limit'] ?? 10;
            unset($where['page'], $where['limit'], $where['uid']);
            $where['receive_types'] = 3;
            $where['is_del'] = 0;
            $where['status'] = 1;
            return app()->make(StoreCouponIssueServices::class)->getList($where, $page, $limit);
        } else {
            return app()->make(StoreCouponUserServices::class)->getUserCouponList($where['uid'])['list'];
        }
    }

    /**
     * 用户数据修改
     * @param $uid
     * @param $data
     * @return bool
     * @throws \think\Exception
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/11/17
     */
    public function userUpdate($uid, $data)
    {
        $userServices = app()->make(UserServices::class);
        $userInfo = $userServices->getUserInfo($uid);
        switch ($data['type']) {
            case 0: // 余额
                /** @var UserMoneyServices $userMoneyServices */
                $userMoneyServices = app()->make(UserMoneyServices::class);
                if ($data['status'] == 1) { //增加
                    $edit['now_money'] = bcadd($userInfo['now_money'], $data['number'], 2);
                    $userMoneyServices->income('system_add', $uid, $data['number'], $edit['now_money'], 0, '移动端商家管理增加余额');
                    //增加充值记录
                    $recharge_data = [
                        'order_id' => app()->make(StoreOrderCreateServices::class)->getNewOrderId('cz'),
                        'uid' => $uid,
                        'price' => $data['number'],
                        'recharge_type' => 'system',
                        'paid' => 1,
                        'add_time' => time(),
                        'give_price' => 0,
                        'channel_type' => 'system',
                        'pay_time' => time(),
                    ];
                    app()->make(UserRechargeServices::class)->save($recharge_data);
                } else { //减少
                    if ($userInfo['now_money'] > $data['number']) {
                        $edit['now_money'] = bcsub($userInfo['now_money'], $data['number'], 2);
                    } else {
                        $edit['now_money'] = 0;
                        $data['number'] = $userInfo['now_money'];
                    }
                    $userMoneyServices->income('system_sub', $uid, $data['number'], $edit['now_money'], 0, '移动端商家管理减少余额');
                }
                $userServices->update($uid, $edit);
                break;
            case 1: // 积分
                /** @var UserBillServices $userBill */
                $userBill = app()->make(UserBillServices::class);
                $integral_data = ['link_id' => 0, 'number' => $data['number']];
                if ($data['status'] == 1) { //增加
                    $edit['integral'] = bcadd($userInfo['integral'], $data['number'], 2);
                    $integral_data['balance'] = $edit['integral'];
                    $integral_data['title'] = '系统增加积分';
                    $integral_data['mark'] = '系统增加了' . floatval($data['number']) . '积分';
                    $userBill->incomeIntegral($uid, 'system_add', $integral_data);
                } else { //减少
                    $edit['integral'] = bcsub($userInfo['integral'], $data['number'], 2);
                    $integral_data['balance'] = $edit['integral'];
                    $integral_data['title'] = '系统减少积分';
                    $integral_data['mark'] = '系统扣除了' . floatval($data['number']) . '积分';
                    $userBill->expendIntegral($uid, 'system_sub', $integral_data);
                }
                $userServices->update($uid, $edit);
                break;
            case 2: // 等级
                $userServices->saveGiveLevel((int)$uid, (int)$data['level']);
                break;
            case 3: // 付费会员
                $userServices->saveGiveLevelTime((int)$uid, (int)$data['days']);
                break;
            case 4: // 优惠券
                /** @var StoreCouponIssueServices $issueService */
                $issueService = app()->make(StoreCouponIssueServices::class);
                $coupon = $issueService->get($data['coupon_id']);
                if (!$coupon) {
                    throw new ApiException('优惠券不存在');
                } else {
                    $coupon = $coupon->toArray();
                }
                $issueService->setCoupon($coupon, [$uid]);
                break;
            case 5: // 分组
                $userServices->saveSetGroup([$uid], $data['group_id']);
                break;
            case 6: // 用户标签
                $userServices->saveSetLabel([$uid], $data['label_id'], 0);
                break;
        }
        return true;
    }
}
