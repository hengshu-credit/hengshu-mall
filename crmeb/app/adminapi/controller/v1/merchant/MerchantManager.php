<?php
namespace app\adminapi\controller\v1\merchant;

use app\adminapi\controller\AuthController;
use app\services\merchant\MerchantServices;
use app\services\merchant\MerchantInstaller;
use app\services\merchant\MerchantData;
use app\services\merchant\MerchantDocuments;
use app\services\system\admin\SystemRoleServices;
use crmeb\exceptions\AuthException;
use crmeb\exceptions\AdminException;

class MerchantManager extends AuthController
{
    protected function permits(string $action): bool
    {
        if (empty($this->adminInfo['level'])) return true;
        $roles=app()->make(SystemRoleServices::class)->getRolesByAuth($this->adminInfo['roles'] ?? [],2);
        $permission=MerchantInstaller::PERMISSIONS[$action] ?? null;
        return $permission && in_array($permission[2],$roles[$permission[1]] ?? [],true);
    }
    protected function requirePermission(string $action): void { if (!$this->permits($action)) throw new AuthException('没有权限访问'); }
    private function service(): MerchantServices { return app()->make(MerchantServices::class); }
    private function actor(): array { return ['kind'=>'admin','id'=>(int)$this->adminId,'name'=>(string)(!empty($this->adminInfo['real_name']) ? $this->adminInfo['real_name'] : ($this->adminInfo['account'] ?? '管理员')),'source'=>'admin','sensitive'=>$this->permits('sensitive')]; }
    private function key(): string { return (string)$this->request->post('request_key',''); }
    private function version(): int { return (int)$this->request->param('version',0); }
    private function page(): array { return [max(1,(int)$this->request->get('page',1)),min(100,max(1,(int)$this->request->get('limit',20)))]; }
    private function profile(): array { $data=$this->request->post('profile',[]); if (!is_array($data)) throw new AdminException('资料格式不正确'); return $data; }
    public function config()
    {
        if (!$this->permits('list') && !$this->permits('save') && !$this->permits('applications') && !$this->permits('type-list') && !$this->permits('tag-list')) throw new AuthException('没有权限访问');
        $permissions=[]; foreach (MerchantInstaller::PERMISSIONS as $key=>$value) $permissions[$key]=$this->permits($key);
        return app('json')->success(['permissions'=>$permissions,'types'=>$this->service()->dictionary('type'),'tags'=>$this->service()->dictionary('tag'),'platform_id'=>MerchantInstaller::platformId(),'labels'=>MerchantData::LABELS]);
    }
    public function index() { $this->requirePermission('list'); return app('json')->success($this->service()->list($this->request->getMore([['keyword',''],['state',''],['audit_status',''],['type_id',''],['tag_ids',[]]]),...$this->page())); }
    public function info($id) { $this->requirePermission('info'); return app('json')->success($this->service()->info((int)$id,$this->permits('sensitive'))); }
    public function save($id) { $this->requirePermission('save'); return app('json')->success($this->service()->saveShop((int)$id,$this->profile(),$this->version(),$this->actor(),$this->key())); }
    public function submit($id) { $this->requirePermission('submit'); return app('json')->success($this->service()->submitShop((int)$id,$this->version(),$this->actor(),$this->key())); }
    public function status($id) { $this->requirePermission('status'); return app('json')->success($this->service()->setState((int)$id,$this->version(),(string)$this->request->post('state'),$this->actor(),$this->key())); }
    public function history($id) { $this->requirePermission('history'); return app('json')->success($this->service()->histories((int)$id,$this->request->getMore([['event_type',''],['actor_name',''],['from',''],['to','']]),$this->permits('sensitive'),...$this->page())); }
    public function options()
    {
        $allowed=$this->permits('list') || $this->permits('save');
        if (!$allowed) {
            $roles=app()->make(SystemRoleServices::class)->getRolesByAuth($this->adminInfo['roles'] ?? [],2);
            $allowed=in_array('product/product/<id>',$roles['post'] ?? [],true) || in_array('product/product/<id>',$roles['get'] ?? [],true) || in_array('product/product',$roles['get'] ?? [],true);
        }
        if (!$allowed) throw new AuthException('没有读取商户候选的权限');
        return app('json')->success($this->service()->options((string)$this->request->get('keyword',''),MerchantData::ids($this->request->get('selected_ids',[]))));
    }
    public function applications() { $this->requirePermission('applications'); return app('json')->success($this->service()->applications($this->request->getMore([['status',''],['kind','']]),...$this->page())); }
    public function applicationInfo($id)
    {
        $this->requirePermission('application-info');
        $info=$this->service()->applicationInfo((int)$id,$this->permits('sensitive'));
        if ($this->permits('history')) $info['history']=$this->service()->histories(0,[],$this->permits('sensitive'),1,100,(int)$id);
        return app('json')->success($info);
    }
    public function review($id) { $this->requirePermission('audit'); return app('json')->success($this->service()->review((int)$id,$this->version(),(string)$this->request->post('decision'),(string)$this->request->post('opinion',''),$this->actor(),$this->key())); }
    public function withdraw($id) { $this->requirePermission('withdraw'); return app('json')->success($this->service()->withdraw((int)$id,$this->version(),$this->actor(),$this->key())); }
    public function types() { $this->requirePermission('type-list'); return app('json')->success($this->service()->dictionary('type')); }
    public function tags() { $this->requirePermission('tag-list'); return app('json')->success($this->service()->dictionary('tag')); }
    private function saveDictionary(string $kind, int $id) { $this->requirePermission($kind.'-save'); return app('json')->success($this->service()->saveDictionary($kind,$id,$this->profile(),$this->version(),$this->actor(),$this->key())); }
    public function saveType($id) { return $this->saveDictionary('type',(int)$id); }
    public function saveTag($id) { return $this->saveDictionary('tag',(int)$id); }
    private function deleteDictionary(string $kind, int $id) { $this->requirePermission($kind.'-delete'); return app('json')->success($this->service()->deleteDictionary($kind,$id,$this->version(),$this->actor(),$this->key())); }
    public function deleteType($id) { return $this->deleteDictionary('type',(int)$id); }
    public function deleteTag($id) { return $this->deleteDictionary('tag',(int)$id); }
    public function upload() { $this->requirePermission('files'); return app('json')->success((new MerchantDocuments())->upload($this->request->file('file'),(string)$this->request->post('kind','contract'),(int)$this->request->post('shop_id',0),$this->actor())); }
    public function document($id) { $this->requirePermission('files'); return (new MerchantDocuments())->response((int)$id,$this->actor(),(bool)$this->request->get('preview',false)); }
    public function export($id) { $this->requirePermission('export'); $this->requirePermission('files'); return (new MerchantDocuments())->export((int)$id,$this->actor()); }
}
