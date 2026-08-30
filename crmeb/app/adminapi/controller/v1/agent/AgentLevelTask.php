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
 * 分销等级任务控制器
 * Class AgentLevelTask
 * @package app\controller\admin\v1\agent
 */
class AgentLevelTask extends AuthController
{
    /**
     * @var AgentLevelTaskServices
     */
    protected $services;

    /**
     * AgentLevelTask constructor.
     * @param App $app
     * @param AgentLevelTaskServices $services
     */
    public function __construct(App $app, AgentLevelTaskServices $services)
    {
        parent::__construct($app);
        $this->services = $services;
    }

    /**
     * 显示等级任务列表
     * @return mixed
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     */
    public function index()
    {
        // 获取请求参数：等级ID、状态、关键词
        $where = $this->request->getMore([
            ['id', 0],
            ['status', ''],
            ['keyword', '']
        ]);
        if (!$where['id']) {
            return app('json')->fail('参数错误');
        }
        $where['level_id'] = $where['id'];
        unset($where['id']);
        // 调用服务层获取等级任务列表
        return app('json')->success($this->services->getLevelTaskList($where));
    }

    /**
     * 等级任务添加表单
     * @return mixed
     * @throws \FormBuilder\Exception\FormBuilderException
     */
    public function create()
    {
        // 获取等级ID
        [$level_id] = $this->request->postMore([
            ['level_id', 0]], true);
        if (!$level_id) {
            return app('json')->fail('参数错误');
        }
        // 调用服务层创建添加表单
        return app('json')->success($this->services->createForm((int)$level_id));
    }

    /**
     * 保存等级任务
     * @return mixed
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     */
    public function save()
    {
        // 获取并验证请求数据
        $data = $this->request->postMore([
            ['level_id', 0],
            ['name', ''],
            ['type', ''],
            ['number', 0],
            ['desc', 0],
            ['sort', 0],
            ['status', 0]]);
        if (!$data['level_id']) return app('json')->fail('参数错误');
        if (!$data['name']) return app('json')->fail('请输入任务名称');
        if (!$data['type']) return app('json')->fail('请选择任务类型');
        if (!$data['number']) return app('json')->fail('请输入限定数量');
        // 检查任务类型是否有效
        $this->services->checkTypeTask(0, $data);
        $data['add_time'] = time();
        // 保存任务数据
        $this->services->save($data);
        // 更新等级的任务数量
        $levelInfo = app()->make(AgentLevelServices::class)->get((int)$data['level_id']);
        $levelInfo->task_num = $levelInfo->task_num + 1;
        $levelInfo->task_total_num = $levelInfo->task_total_num + 1;
        $levelInfo->save();
        return app('json')->success('添加任务成功');
    }

    /**
     * 显示指定的资源
     * @param $id
     */
    public function read($id)
    {

    }

    /**
     * 等级任务修改表单
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
     * 修改等级任务
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
            ['type', ''],
            ['number', 0],
            ['desc', 0],
            ['sort', 0],
            ['status', 0]]);
        if (!$data['name']) return app('json')->fail('请输入任务名称');
        if (!$data['type']) return app('json')->fail('请选择任务类型');
        if (!$data['number']) return app('json')->fail('请输入限定数量');
        // 检查任务是否存在
        if (!$levelTaskInfo = $this->services->getLevelTaskInfo((int)$id)) return app('json')->fail('编辑的任务不存在');
        // 检查任务类型是否有效
        $this->services->checkTypeTask((int)$id, $data);
        // 更新任务信息
        $levelTaskInfo->name = $data['name'];
        $levelTaskInfo->type = $data['type'];
        $levelTaskInfo->number = $data['number'];
        $levelTaskInfo->desc = $data['desc'];
        $levelTaskInfo->sort = $data['sort'];
        $levelTaskInfo->status = $data['status'];
        $levelTaskInfo->save();
        return app('json')->success('修改成功');
    }

    /**
     * 删除等级任务
     * @param $id
     * @return mixed
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     */
    public function delete($id)
    {
        if (!$id) return app('json')->fail('参数错误');
        $levelTaskInfo = $this->services->getLevelTaskInfo((int)$id);
        if ($levelTaskInfo) {
            // 标记删除
            $res = $this->services->update($id, ['is_del' => 1]);
            if ($res) {
                // 更新等级的任务数量
                $levelInfo = app()->make(AgentLevelServices::class)->get((int)$levelTaskInfo['level_id']);
                $levelInfo->task_num = $levelInfo->task_num - 1;
                $levelInfo->task_total_num = $levelInfo->task_total_num - 1;
                if ($levelInfo->task_num <= 0) $levelInfo->task_num = $levelInfo->task_total_num;
                $levelInfo->save();
            } else {
                return app('json')->fail('删除失败');
            }
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

}
