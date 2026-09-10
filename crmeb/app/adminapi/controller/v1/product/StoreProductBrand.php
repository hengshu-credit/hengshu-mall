<?php
namespace app\adminapi\controller\v1\product;

use app\adminapi\controller\AuthController;
use app\services\product\product\StoreProductBrandServices;
use app\services\system\admin\SystemRoleServices;
use crmeb\exceptions\AuthException;
use think\facade\App;

class StoreProductBrand extends AuthController
{
    protected $brands;

    public function __construct(App $app, StoreProductBrandServices $brands)
    {
        parent::__construct($app);
        $this->brands = $brands;
    }

    // Existing global role middleware is permissive; enforce new brand permissions here.
    protected function requirePermission(array $allowed): void
    {
        if (empty($this->adminInfo['level'])) return;
        $auth = app()->make(SystemRoleServices::class)->getRolesByAuth($this->adminInfo['roles'] ?? [], 2);
        foreach ($allowed as [$method, $route]) {
            if (in_array($route, $auth[$method] ?? [], true)) return;
        }
        throw new AuthException('没有权限访问');
    }

    public function index()
    {
        $this->requirePermission([['get', 'product/brand/list']]);
        return app('json')->success($this->brands->brandList($this->request->getMore([['name', ''], ['status', ''], ['is_global', ''], ['cate_id', '']])));
    }

    public function info($id)
    {
        $this->requirePermission([['get', 'product/brand/info/<id>']]);
        return app('json')->success($this->brands->brandInfo((int)$id));
    }

    public function save($id)
    {
        $this->requirePermission([['post', 'product/brand/save/<id>']]);
        $data = $this->request->postMore([['name', ''], ['logo', ''], ['description', ''], ['sort', 0], ['status', 1], ['is_global', 1], ['cate_ids', []]]);
        return app('json')->success(['id' => $this->brands->saveBrand((int)$id, $data)]);
    }

    public function status($id, $status)
    {
        $this->requirePermission([['put', 'product/brand/status/<id>/<status>']]);
        $this->brands->setBrandStatus((int)$id, $status);
        return app('json')->success('修改成功');
    }

    public function delete($id)
    {
        $this->requirePermission([['delete', 'product/brand/del/<id>']]);
        $this->brands->deleteBrand((int)$id);
        return app('json')->success('删除成功');
    }

    public function options()
    {
        $this->requirePermission([['get', 'product/product/<id>'], ['post', 'product/product/<id>'], ['get', 'product/brand/list']]);
        [$cateIds, $selectedIds] = $this->request->getMore([['cate_ids', []], ['selected_ids', []]], true);
        return app('json')->success($this->brands->options($cateIds, $selectedIds));
    }
}
