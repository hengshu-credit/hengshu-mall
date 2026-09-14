<?php
namespace app\adminapi\controller\v1\marketing;
use app\adminapi\controller\AuthController;
use app\services\activity\ranking\RankingConfig;
use app\services\activity\ranking\RankingServices;
use app\services\system\admin\SystemRoleServices;
use crmeb\exceptions\AuthException;
use think\facade\App;

class Ranking extends AuthController
{
    protected $rankings;
    public function __construct(App $app, RankingServices $rankings) { parent::__construct($app); $this->rankings=$rankings; }
    protected function permission(string $method,string $path): void
    {
        if (empty($this->adminInfo['level'])) return;
        $auth=app()->make(SystemRoleServices::class)->getRolesByAuth($this->adminInfo['roles']??[],2);
        if (!in_array('marketing/ranking/'.$path,$auth[$method]??[],true)) throw new AuthException('没有权限访问');
    }
    private function input(): array
    {
        return $this->request->postMore([['name',''],['description',''],['entity_type','product'],['enabled',0],['priority',0],['top_n',20],['start_time',0],['end_time',0],['window_days',30],['match_mode','all'],['conditions',[]],['condition_tree',null],['preview_uid',0],['exclude_ids',[]],['sort_mode','single'],['metrics',[]],['adjustments',[]],['version',0]]);
    }
    public function index() { $this->permission('get','list'); return app('json')->success($this->rankings->listing($this->request->getMore([['keyword',''],['entity_type',''],['enabled','']]))); }
    public function info($id) { $this->permission('get','info/<id>'); return app('json')->success($this->rankings->info(RankingConfig::integer($id,1,2147483647,'榜单编号'))); }
    public function options() { $this->permission('get','options'); return app('json')->success($this->rankings->options($this->request->getMore([['type','product'],['keyword',''],['ids',[]]]))); }
    public function save($id) { $this->permission('post','save/<id>'); return app('json')->success(['id'=>$this->rankings->saveRanking(RankingConfig::integer($id,0,2147483647,'榜单编号'),$this->input())]); }
    public function preview() { $this->permission('post','preview'); return app('json')->success($this->rankings->preview($this->input())); }
    public function status($id) { $this->permission('put','status/<id>'); $this->rankings->setEnabled(RankingConfig::integer($id,1,2147483647,'榜单编号'),$this->request->post('enabled')); return app('json')->success('状态已更新'); }
    public function delete($id) { $this->permission('delete','del/<id>'); $this->rankings->deleteRanking(RankingConfig::integer($id,1,2147483647,'榜单编号')); return app('json')->success('榜单已删除，装修页面保留'); }
}
