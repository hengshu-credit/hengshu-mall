<?php
namespace app\adminapi\controller\v1\marketing;

use app\adminapi\controller\AuthController;
use app\services\activity\fullreduction\StoreFullReductionServices;
use app\services\system\admin\SystemRoleServices;
use crmeb\exceptions\AuthException;
use crmeb\exceptions\AdminException;
use think\facade\App;

class StoreFullReduction extends AuthController
{
    protected $activities;

    public function __construct(App $app, StoreFullReductionServices $activities)
    {
        parent::__construct($app);
        $this->activities = $activities;
    }

    // Enforce this module's permissions even when the legacy global middleware is permissive.
    protected function requirePermission(string $method, string $route): void
    {
        if (empty($this->adminInfo['level'])) return;
        $auth = app()->make(SystemRoleServices::class)->getRolesByAuth($this->adminInfo['roles'] ?? [], 2);
        if (!in_array('marketing/full_reduction/' . $route, $auth[$method] ?? [], true)) throw new AuthException('没有权限访问');
    }

    private function activityId($id, bool $allowNew = false): int
    {
        if (!preg_match('/^(0|[1-9][0-9]{0,9})$/D', (string)$id) || $id > 2147483647 || (!$allowNew && !$id)) throw new AdminException('活动ID不正确');
        return (int)$id;
    }

    public function index()
    {
        $this->requirePermission('get', 'list');
        return app('json')->success($this->activities->activityList($this->request->getMore([
            ['name', ''], ['state', ''], ['status', ''], ['sort_field', 'sort'], ['sort_order', 'ascending'],
        ])));
    }

    public function info($id)
    {
        $this->requirePermission('get', 'info/<id>');
        return app('json')->success($this->activities->activityInfo($this->activityId($id)));
    }

    public function options()
    {
        $this->requirePermission('get', 'options');
        return app('json')->success($this->activities->options($this->request->getMore([
            ['type', 'product'], ['keyword', ''], ['category_id', 0], ['brand_id', 0], ['label_id', 0],
        ])));
    }

    public function save($id)
    {
        $this->requirePermission('post', 'save/<id>');
        $data = $this->request->postMore([
            ['name', ''], ['start_time', ''], ['end_time', ''], ['unit', 1], ['rules_type', 1], ['discount_type', 1],
            ['rules', []], ['range_type', 0], ['product_ids', []], ['level_ids', []], ['member_type', 'all'],
            ['member_ids', []], ['tag_match', 'any'], ['status', 1], ['sort', 50],
        ]);
        return app('json')->success(['id' => $this->activities->saveActivity($this->activityId($id, true), $data)]);
    }

    public function status($id)
    {
        $this->requirePermission('put', 'status/<id>');
        $this->activities->setActivityStatus($this->activityId($id), $this->request->post('status'));
        return app('json')->success('状态已更新');
    }

    public function sort($id)
    {
        $this->requirePermission('put', 'sort/<id>');
        $this->activities->setActivitySort($this->activityId($id), $this->request->post('sort'));
        return app('json')->success('排序已更新');
    }

    public function delete($id)
    {
        $this->requirePermission('delete', 'del/<id>');
        $this->activities->deleteActivities([$this->activityId($id)]);
        return app('json')->success('删除成功');
    }

    public function batchDelete()
    {
        $this->requirePermission('post', 'batch_delete');
        $this->activities->deleteActivities($this->request->post('ids', []));
        return app('json')->success('批量删除成功');
    }
}
