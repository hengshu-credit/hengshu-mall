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
namespace app\adminapi\controller\v1\agent;

use app\adminapi\controller\AuthController;
use app\services\agent\DivisionAgentApplyServices;
use app\services\agent\DivisionServices;
use app\services\other\AgreementServices;
use app\services\user\UserServices;
use crmeb\exceptions\AdminException;
use think\facade\App;

/**
 * 事业部控制器
 * Class Division
 * @package app\adminapi\controller\v1\agent
 */
class Division extends AuthController
{
    /**
     * @var DivisionServices
     */
    protected $services;

    /**
     * Division constructor.
     * @param App $app
     * @param DivisionServices $services
     */
    public function __construct(App $app, DivisionServices $services)
    {
        parent::__construct($app);
        $this->services = $services;
    }

    /**
     * 事业部列表
     * @return mixed
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     */
    public function divisionList()
    {
        // 获取请求参数
        $where = $this->request->getMore([
            ['division_type', 0],
            ['keyword', '']
        ]);
        if ($where['division_type'] == 2) {
            $where['division_id'] = $this->adminInfo['division_id'];
        }
        // 调用服务层获取事业部列表
        $data = $this->services->getDivisionList($where);
        return app('json')->success($data);
    }

    /**
     * 下级列表
     * @return mixed
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     */
    public function divisionDownList()
    {
        // 获取参数：事业部类型、用户ID
        [$type, $uid] = $this->request->getMore([
            ['division_type', 0],
            ['uid', 0],
        ], true);
        // 调用服务层获取下级列表
        $data = $this->services->divisionDownList($type, $uid);
        return app('json')->success($data);
    }

    /**
     * 添加编辑事业部
     * @param $uid
     * @return mixed
     * @throws \FormBuilder\Exception\FormBuilderException
     */
    public function divisionCreate($uid)
    {
        // 调用服务层获取事业部表单
        return app('json')->success($this->services->getDivisionForm((int)$uid));
    }

    /**
     * 保存事业部
     * @return mixed
     */
    public function divisionSave()
    {
        // 获取并验证请求数据
        $data = $this->request->postMore([
            ['uid', 0],
            ['aid', 0],
            ['division_percent', 0],
            ['division_end_time', ''],
            ['division_status', 1],
            ['account', ''],
            ['pwd', ''],
            ['conf_pwd', ''],
            ['division_name', ''],
            ['roles', []],
            ['image', []]
        ]);
        // 保存事业部数据
        $this->services->divisionSave($data);
        return app('json')->success('保存成功');
    }

    /**
     * 添加编辑代理商
     * @param $uid
     * @return mixed
     * @throws \FormBuilder\Exception\FormBuilderException
     */
    public function divisionAgentCreate($uid)
    {
        // 调用服务层获取代理商表单
        return app('json')->success($this->services->getDivisionAgentForm((int)$uid));
    }

    /**
     * 保存代理商
     * @param UserServices $userServices
     * @return mixed
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     */
    public function divisionAgentSave(UserServices $userServices)
    {
        // 获取并验证请求数据
        $data = $this->request->postMore([
            ['division_id', 0],
            ['uid', 0],
            ['division_percent', 0],
            ['division_end_time', ''],
            ['division_status', 1],
            ['division_name', ''],
            ['edit', 0],
            ['image', []],
        ]);
        if ((int)$data['uid'] == 0) $data['uid'] = $data['image']['uid'];
        // 验证用户信息
        $userInfo = $userServices->getUserInfo($data['uid'], 'is_division,is_agent,is_staff');
        if (!$userInfo) throw new AdminException('参数错误');
        if ($data['edit'] == 0) {
            if ($userInfo['is_division']) throw new AdminException('此用户是事业部，请勿添加为代理商');
            if ($userInfo['is_agent']) throw new AdminException('此用户是代理商，无法重复添加');
            if ($userInfo['is_staff']) throw new AdminException('此用户是下级员工，无法添加为代理商');
            // 验证事业部信息
            $divisionUserInfo = $userServices->count(['uid' => (int)$data['division_id'], 'is_division' => 1, 'division_id' => $data['division_id']]);
            if (!$divisionUserInfo) throw new AdminException('参数错误');
        }
        // 保存代理商数据
        $this->services->divisionAgentSave($data);
        return app('json')->success('保存成功');
    }

    /**
     * 设置状态
     * @param $status
     * @param $uid
     * @return mixed
     */
    public function setDivisionStatus($status, $uid)
    {
        // 调用服务层设置状态
        $this->services->setDivisionStatus($status, $uid);
        return app('json')->success('设置成功');
    }

    /**
     * 删除成功
     * @param $type
     * @param $uid
     * @return mixed
     */
    public function delDivision($type, $uid)
    {
        // 调用服务层删除事业部/代理商
        $this->services->delDivision($type, $uid);
        return app('json')->success('删除成功');
    }

    /**
     * 后台申请列表
     * @return mixed
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     */
    public function AdminApplyList()
    {
        // 获取请求参数
        $where = $this->request->getMore([
            ['uid', 0],
            ['division_id', 0],
            ['division_invite', ''],
            ['status', ''],
            ['keyword', ''],
            ['time', ''],
        ]);
        $where['division_id'] = $this->adminInfo['division_id'];
        /** @var DivisionAgentApplyServices $applyServices */
        $applyServices = app()->make(DivisionAgentApplyServices::class);
        // 获取申请列表
        $data = $applyServices->AdminApplyList($where);
        return app('json')->success($data);
    }

    /**
     * 审核表单
     * @param $id
     * @param $type
     * @return mixed
     * @throws \FormBuilder\Exception\FormBuilderException
     */
    public function examineApply($id, $type)
    {
        /** @var DivisionAgentApplyServices $applyServices */
        $applyServices = app()->make(DivisionAgentApplyServices::class);
        // 获取审核表单
        $data = $applyServices->examineApply($id, $type);
        return app('json')->success($data);
    }

    /**
     * 代理商审核
     * @return mixed
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     */
    public function applyAgentSave()
    {
        // 获取审核参数
        $data = $this->request->getMore([
            ['type', 0],
            ['id', 0],
            ['division_percent', ''],
            ['division_end_time', ''],
            ['division_status', ''],
            ['refusal_reason', 0]
        ]);
        /** @var DivisionAgentApplyServices $applyServices */
        $applyServices = app()->make(DivisionAgentApplyServices::class);
        // 保存审核结果
        $data = $applyServices->applyAgentSave($data);
        return app('json')->success('设置成功');
    }

    /**
     * 删除代理商审核
     * @param $id
     * @return mixed
     */
    public function delApply($id)
    {
        /** @var DivisionAgentApplyServices $applyServices */
        $applyServices = app()->make(DivisionAgentApplyServices::class);
        // 删除申请记录
        $applyServices->delApply($id);
        return app('json')->success('删除成功');
    }

    /**
     * 添加员工表单
     * @param $uid
     * @return \think\Response
     * @throws \FormBuilder\Exception\FormBuilderException
     * @author 吴汐
     * @email 442384644@qq.com
     * @date 2024/1/22
     */
    public function divisionStaffCreate($uid)
    {
        // 调用服务层获取员工表单
        return app('json')->success($this->services->getDivisionStaffForm((int)$uid));
    }

    /**
     * 保存员工
     * @return \think\Response
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     * @author 吴汐
     * @email 442384644@qq.com
     * @date 2024/1/22
     */
    public function divisionStaffSave()
    {
        // 获取并验证请求数据
        $data = $this->request->getMore([
            ['uid', 0],
            ['division_percent', 0],
            ['agent_id', 0],
            ['image', []],
        ]);
        // 保存员工数据
        $this->services->divisionStaffSave($data);
        return app('json')->success('保存成功');
    }

    /**
     * 分销统计
     * @return \think\Response
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2025/4/8
     */
    public function divisionStatistics()
    {
        // 获取请求参数：类型、时间、分页、排序
        [$type, $time, $page, $limit, $sort, $order] = $this->request->getMore([
            ['type', 0],
            ['time', ''],
            ['page', 1],
            ['limit', 15],
            ['sort', 'order_sum'],
            ['order', 'desc'],
        ], true);
        $time = $time != '' ? explode('-', $time) : [];
        // 获取统计数据
        $data = $this->services->divisionStatistics($type, $time, $page, $limit, $sort, $order);
        return app('json')->success($data);

    }
}
