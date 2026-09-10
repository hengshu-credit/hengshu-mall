<?php
namespace app\adminapi\controller\v1\marketing;
use app\adminapi\controller\AuthController;
use app\services\activity\style\MarketingStyleServices;
use app\services\system\admin\SystemRoleServices;
use crmeb\exceptions\AuthException;
use crmeb\exceptions\AdminException;
use think\facade\App;

class MarketingStyle extends AuthController
{
    protected $styles;
    public function __construct(App $app, MarketingStyleServices $styles) { parent::__construct($app); $this->styles=$styles; }
    protected function permission(string $method,string $path): void
    {
        if (empty($this->adminInfo['level'])) return;
        $auth=app()->make(SystemRoleServices::class)->getRolesByAuth($this->adminInfo['roles']??[],2);
        if (!in_array('marketing/style/'.$path,$auth[$method]??[],true)) throw new AuthException('没有权限访问');
    }
    private function styleId($id,bool $new=false): int
    {
        if (!preg_match('/^(0|[1-9][0-9]{0,9})$/D',(string)$id) || $id>2147483647 || (!$new && !$id)) throw new AdminException('营销样式ID不正确');
        return (int)$id;
    }
    public function index()
    {
        $this->permission('get','list');
        return app('json')->success($this->styles->styleList($this->request->getMore([['keyword',''],['kind',''],['status',''],['enabled',''],['from',''],['to','']])));
    }
    public function info($id) { $this->permission('get','info/<id>'); return app('json')->success($this->styles->info($this->styleId($id))); }
    public function options() { $this->permission('get','options'); return app('json')->success($this->styles->options($this->request->getMore([['type','product'],['keyword','']]))); }
    public function save($id)
    {
        $this->permission('post','save/<id>');
        $data=$this->request->postMore([['name',''],['kind',''],['mobile_image',''],['pc_image',''],['start_time',0],['end_time',0],['enabled',0],['priority',0],['scope_type','all'],['scope_ids',[]]]);
        return app('json')->success(['id'=>$this->styles->saveStyle($this->styleId($id,true),$data)]);
    }
    public function status($id) { $this->permission('put','status/<id>'); $this->styles->setEnabled($this->styleId($id),$this->request->post('enabled')); return app('json')->success('状态已更新'); }
    public function delete($id) { $this->permission('delete','del/<id>'); $this->styles->deleteStyle($this->styleId($id)); return app('json')->success('删除成功'); }
}
