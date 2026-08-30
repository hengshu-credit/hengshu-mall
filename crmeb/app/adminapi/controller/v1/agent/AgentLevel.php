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
use app\services\agent\AgentLevelServices;
use app\services\agent\AgentLevelTaskServices;
use think\facade\App;

/**
 * 分销等级控制器
 * Class AgentLevel
 * @package app\controller\admin\v1\agent
 */
class AgentLevel extends AuthController
{
    /**
     * @var AgentLevelServices
     */
    protected $services;

    /**
     * AgentLevel constructor.
     * @param App $app
     * @param AgentLevelServices $services
     */
    public function __construct(App $app, AgentLevelServices $services)
    {
        parent::__construct($app);
        $this->services = $services;
    }

    /**
     * 后台分销等级列表
     * @return mixed
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     */
    public function index()
    {
        // 获取请求参数，包括状态和关键词
        $where = $this->request->getMore([
            ['status', ''],
            ['keyword', '']
        ]);
        // 调用服务层获取等级列表
        return app('json')->success($this->services->getLevelList($where));
    }

    /**
     * 添加分销等级表单
     * @return mixed
     * @throws \FormBuilder\Exception\FormBuilderException
     */
    public function create()
    {
        // 调用服务层创建添加表单
        return app('json')->success($this->services->createForm());
    }

    /**
     * 保存分销等级
     * @return mixed
     */
    public function save()
    {
        // 获取并验证请求数据
        $data = $this->request->postMore([
            ['name', ''],
            ['grade', 0],
            ['image', ''],
            ['one_brokerage_percent', 0],
            ['two_brokerage_percent', 0],
            ['status', 0]]);
        if (!$data['name']) return app('json')->fail('请输入等级名称');
        if (!$data['grade']) return app('json')->fail('请输入等级');
        if (!$data['image']) return app('json')->fail('请选择等级图标');
        // 验证二级返佣比例是否大于一级
        if ($data['two_brokerage_percent'] > $data['one_brokerage_percent']) {
            return app('json')->fail('二级返佣比例不能大于一级');
        }
        // 检查等级是否已存在
        $grade = $this->services->get(['grade' => $data['grade'], 'is_del' => 0]);
        if ($grade) {
            return app('json')->fail('当前等级已存在');
        }
        $data['add_time'] = time();
        // 保存数据
        $this->services->save($data);
        return app('json')->success('添加等级成功');
    }

    /**
     * 显示指定的资源
     * @param $id
     */
    public function read($id)
    {

    }

    /**
     * 编辑分销等级表单
     * @param $id
     * @return mixed
     * @throws \FormBuilder\Exception\FormBuilderException
     */
    public function edit($id)
    {
        // 调用服务层创建编辑表单
        return app('json')->success($this->services->editForm((int)$id));
    }

    /**
     * 修改分销等级
     * @param $id
     * @return mixed
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     */
    public function update($id)
    {
        // 获取并验证请求数据
        $data = $this->request->postMore([
            ['name', ''],
            ['grade', 0],
            ['image', ''],
            ['one_brokerage_percent', 0],
            ['two_brokerage_percent', 0],
            ['status', 0]]);
        if (!$data['name']) return app('json')->fail('请输入等级名称');
        if (!$data['grade']) return app('json')->fail('请输入等级');
        if (!$data['image']) return app('json')->fail('请选择等级图标');
        // 验证二级返佣比例是否大于一级
        if ($data['two_brokerage_percent'] > $data['one_brokerage_percent']) {
            return app('json')->fail('二级返佣比例不能大于一级');
        }
        // 检查编辑的等级是否存在
        if (!$levelInfo = $this->services->getLevelInfo((int)$id)) return app('json')->fail('编辑的等级不存在');
        // 检查等级是否重复
        $grade = $this->services->get(['grade' => $data['grade'], 'is_del' => 0]);
        if ($grade && $grade['id'] != $id) {
            return app('json')->fail('当前等级已存在');
        }

        // 更新等级信息
        $levelInfo->name = $data['name'];
        $levelInfo->grade = $data['grade'];
        $levelInfo->image = $data['image'];
        $levelInfo->one_brokerage_percent = $data['one_brokerage_percent'];
        $levelInfo->two_brokerage_percent = $data['two_brokerage_percent'];
        $levelInfo->status = $data['status'];
        $levelInfo->save();
        return app('json')->success('修改成功');
    }

    /**
     * 删除分销等级
     * @param $id
     * @return mixed
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     */
    public function delete($id)
    {
        if (!$id) return app('json')->fail('参数错误');
        //检查分销等级数据是否存在
        $levelInfo = $this->services->getLevelInfo((int)$id);
        if ($levelInfo) {
            //更新数据为已删除
            $res = $this->services->update($id, ['is_del' => 1]);
            if (!$res)
                return app('json')->fail('删除失败');
            //删除该等级的任务为已删除
            /** @var AgentLevelTaskServices $agentLevelTaskServices */
            $agentLevelTaskServices = app()->make(AgentLevelTaskServices::class);
            $agentLevelTaskServices->update(['level_id' => $id], ['is_del' => 1]);
        }
        return app('json')->success('删除成功');
    }

    /**
     * 修改状态
     * @param int $id
     * @param string $status
     * @return mixed
     */
    public function set_status($id = 0, $status = '')
    {
        if ($status == '' || $id == 0) return app('json')->fail('参数错误');
        // 更新状态
        $this->services->update($id, ['status' => $status]);
        return app('json')->success('设置成功');
    }

    /**
     * 获取任务表单数量
     * @param int $id 任务ID
     * @return \think\response\Json
     */
    public function getTaskNumForm($id)
    {
        // 判断任务ID是否为0，若为0则返回错误信息
        if ($id == 0) return app('json')->fail('参数错误');
        // 调用服务层获取任务表单数量
        $result = $this->services->getTaskNumForm($id);
        // 返回成功信息和任务表单数量
        return app('json')->success($result);
    }

    /**
     * 设置任务数量
     * @param int $id 任务ID
     * @return \think\response\Json
     */
    public function setTaskNum($id)
    {
        // 从请求中获取任务数量
        $data = $this->request->postMore([
            ['task_num', 0]
        ]);
        // 调用服务层设置任务数量
        $res = $this->services->setTaskNum($id, $data);
        return app('json')->success('设置成功');
    }
}
