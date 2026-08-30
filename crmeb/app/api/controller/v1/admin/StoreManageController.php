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
namespace app\api\controller\v1\admin;

use app\Request;
use app\services\admin\StoreManageServices;
use app\services\shipping\ShippingTemplatesServices;

class StoreManageController
{
    protected StoreManageServices $services;

    public function __construct(StoreManageServices $services)
    {
        $this->services = $services;
    }

    /**
     * 商家统计
     * @return \think\Response
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/11/13
     */
    public function statistics()
    {
        return app('json')->success($this->services->statistics());
    }

    /**
     * 商家商品
     * @param Request $request
     * @return \think\Response
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/11/13
     */
    public function product(Request $request)
    {
        $where = $request->getMore([
            [['page', 'd'], 1],
            [['limit', 'd'], 10],
            ['type', ''],
            ['store_name', ''],
        ]);
        return app('json')->success($this->services->product($where));
    }

    /**
     * 商家商品上下架
     * @param Request $request
     * @return \think\Response
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/11/13
     */
    public function productShow(Request $request)
    {
        [$id, $isShow] = $request->postMore([
            [['id', 'd'], 0],
            [['is_show', 'd'], 0],
        ], true);
        $this->services->productShow($id, $isShow);
        return app('json')->success('操作成功');
    }

    /**
     * 商家商品标签
     * @return \think\Response
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/11/13
     */
    public function productLabel()
    {
        return app('json')->success($this->services->productLabel());
    }

    /**
     * 商家商品标签保存
     * @param Request $request
     * @return \think\Response
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/11/13
     */
    public function saveProductLabel(Request $request)
    {
        [$ids, $label_list] = $request->postMore([
            ['ids', []],
            ['label_list', []],
        ], true);
        if (is_int($ids)) $ids = [$ids];
        $this->services->saveProductLabel($ids, $label_list);
        return app('json')->success('操作成功');
    }

    /**
     * 商家商品分类
     * @return \think\Response
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/11/13
     */
    public function productCate()
    {
        return app('json')->success($this->services->productCate());
    }

    /**
     * 商家商品分类保存
     * @param Request $request
     * @return \think\Response
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/11/13
     */
    public function saveProductCate(Request $request)
    {
        [$ids, $cate_id] = $request->postMore([
            ['ids', []],
            ['cate_id', []],
        ], true);
        if (is_int($ids)) $ids = [$ids];
        $this->services->saveProductCate($ids, $cate_id);
        return app('json')->success('操作成功');
    }

    /**
     * 商家商品属性
     * @param $id
     * @return \think\Response
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/11/13
     */
    public function productAttr($id)
    {
        return app('json')->success($this->services->productAttr($id));
    }

    /**
     * 商家商品属性保存
     * @param Request $request
     * @param $id
     * @return \think\Response
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/11/13
     */
    public function saveProductAttr(Request $request, $id)
    {
        [$attr_value] = $request->postMore([
            ['attr_value', []],
        ], true);
        $this->services->saveProductAttr($id, $attr_value);
        return app('json')->success('修改成功');
    }

    /**
     * 商家商品运费模版
     * @return \think\Response
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/12/8
     */
    public function shippingTemp()
    {
        /** @var ShippingTemplatesServices $shippingTemplatesServices */
        $shippingTemplatesServices = app()->make(ShippingTemplatesServices::class);
        $data = $shippingTemplatesServices->getSelectList();
        $data = array_merge([['id' => 0, 'name' => '未选择']], $data);
        return app('json')->success($data);
    }

    /**
     * 创建商品
     * @param Request $request
     * @return \think\Response
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/12/9
     */
    public function createProduct(Request $request)
    {
        $data = $request->postMore([
            ['store_name', ''],
            ['slider_image', []],
            ['cate_id', []],
            ['unit_name', ''],
            ['attr', []],
            ['content', ''],
            ['logistics', []],
            ['freight', 2],
            ['postage', 0],
            ['temp_id', 0],
            ['spec_type', 0],
        ]);
        $this->services->createProduct($data);
        return app('json')->success('创建成功');
    }

    /**
     * 商家用户列表
     * @param Request $request
     * @return \think\Response
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/11/17
     */
    public function user(Request $request)
    {
        $where = $request->getMore([
            ['page', 1],
            ['limit', 10],
            ['nickname', ''],
            ['group_id', 0],
            ['level', 0],
            ['label_id', ''],
        ]);
        return app('json')->success($this->services->user($where));
    }

    /**
     * 用户信息
     * @param $uid
     * @return \think\Response
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/11/17
     */
    public function userInfo($uid)
    {
        return app('json')->success($this->services->userInfo($uid));
    }

    /**
     * 用户分组
     * @return \think\Response
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/11/17
     */
    public function userGroup()
    {
        return app('json')->success($this->services->userGroup());
    }

    /**
     * 用户等级
     * @return \think\Response
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/11/17
     */
    public function userLevel()
    {
        return app('json')->success($this->services->userLevel());
    }

    /**
     * 用户标签
     * @param int $uid
     * @return \think\Response
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/11/17
     */
    public function userLabel($uid = 0)
    {
        return app('json')->success($this->services->userLabel($uid));
    }

    /**
     * 用户优惠券列表
     * @param Request $request
     * @return \think\Response
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/11/17
     */
    public function userCoupon(Request $request)
    {
        $where = $request->getMore([
            ['page', 1],
            ['limit', 10],
            ['coupon_title', ''],
            ['uid', 0],
        ]);
        return app('json')->success($this->services->userCoupon($where));
    }

    /**
     * 修改用户信息
     * @param Request $request
     * @param $uid
     * @return \think\Response
     * @throws \think\Exception
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/11/17
     */
    public function userUpdate(Request $request, $uid)
    {
        $data = $request->postMore([
            ['type', 0],
            ['number', 0],
            ['status', 0],
            ['level', 0],
            ['group_id', 0],
            ['days', 0],
            ['coupon_id', 0],
            ['label_id', []],
        ]);
        $this->services->userUpdate($uid, $data);
        return app('json')->success('修改成功');
    }

}
