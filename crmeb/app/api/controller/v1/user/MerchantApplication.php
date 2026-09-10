<?php
namespace app\api\controller\v1\user;

use app\services\merchant\MerchantServices;
use app\services\merchant\MerchantDocuments;
use crmeb\basic\BaseController;
use crmeb\exceptions\ApiException;

class MerchantApplication extends BaseController
{
    private function actor(): array
    {
        $uid=(int)$this->request->uid();
        if (!$uid) throw new ApiException('请先登录');
        return ['kind'=>'user','id'=>$uid,'name'=>(string)($this->request->user('nickname') ?: ('用户#'.$uid)),'source'=>'user','sensitive'=>true];
    }
    public function config()
    {
        $this->actor();
        $types=(new MerchantServices())->dictionary('type',true);
        return app('json')->success(['types'=>array_map(function ($item) { return ['id'=>$item['id'],'name'=>$item['name']]; },$types)]);
    }
    public function index() { $actor=$this->actor(); return app('json')->success((new MerchantServices())->applications([],max(1,(int)$this->request->get('page',1)),20,$actor['id'])); }
    public function info($id) { $actor=$this->actor(); return app('json')->success((new MerchantServices())->applicationInfo((int)$id,true,$actor['id'])); }
    public function save($id)
    {
        $actor=$this->actor(); $profile=$this->request->post('profile',[]);
        if (!is_array($profile)) throw new ApiException('资料格式不正确');
        return app('json')->success((new MerchantServices())->saveUserApplication((int)$id,$profile,(int)$this->request->post('version',0),$actor,(string)$this->request->post('request_key','')));
    }
    public function submit($id) { $actor=$this->actor(); return app('json')->success((new MerchantServices())->submitUserApplication((int)$id,(int)$this->request->post('version',0),$actor,(string)$this->request->post('request_key',''))); }
    public function withdraw($id) { $actor=$this->actor(); return app('json')->success((new MerchantServices())->withdraw((int)$id,(int)$this->request->post('version',0),$actor,(string)$this->request->post('request_key',''))); }
    public function upload() { $actor=$this->actor(); return app('json')->success((new MerchantDocuments())->upload($this->request->file('file'),(string)$this->request->post('kind','contract'),0,$actor)); }
    public function document($id) { return (new MerchantDocuments())->response((int)$id,$this->actor()); }
}
