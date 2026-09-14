<?php
require __DIR__.'/commerce_bootstrap.php';
use think\facade\Db;
hardeningSchema();hardeningReset();
Db::name('store_order_status')->where('1=1')->delete();
Db::name('store_order_status')->insert(['oid'=>9001,'change_type'=>'pay_dispatch_pending','change_message'=>'notice_user','change_time'=>time()]);
$legacy=app()->make(app\services\order\OrderPaymentDispatchServices::class);
checkCommerce($legacy->recoverLegacy()===1&&$legacy->recoverLegacy()===0,'legacy pending records migrate without a callback or duplicate task');
Db::name('commerce_task')->where('1=1')->delete();Db::name('store_order_status')->where('1=1')->delete();
class LeasedTaskProbe extends app\services\system\CommerceTaskServices {
    public $clock=100000;public $fail=false;public $terminal=false;public $calls=0;public $inside;
    protected function now():int{return $this->clock;}
    public function claimForTest($id){return $this->claim($id);}
    protected function deliver(array $row,array $payload){
        checkCommerce(!Db::connect()->getPdo()->inTransaction(),'delivery runs without database transaction');
        $this->calls++;
        if($this->inside){$fn=$this->inside;$this->inside=null;$fn($row);}
        if($this->terminal)throw new app\services\system\CommerceTaskNeedsReview('manual resolution needed');
        if($this->fail)throw new RuntimeException('synthetic unavailable');
        return true;
    }
}
$tasks=new LeasedTaskProbe;
$tasks->stage('order',1,'notice_user');$id=(int)Db::name('commerce_task')->value('id');
$tasks->stage('order',1,'notice_user');checkCommerce(Db::name('commerce_task')->count()===1,'stage duplicate has one durable identity');
$tasks->fail=true;$tasks->run($id);
$row=Db::name('commerce_task')->where('id',$id)->find();
checkCommerce($row['state']==='retry'&&$row['attempts']===1&&$row['next_attempt_at']>$tasks->clock&&$row['last_error']!=='','failed task records attempts error and backoff');
$tasks->run($id);checkCommerce($tasks->calls===1,'backoff prevents immediate retry storms');
for($i=0;$i<12;$i++){$tasks->clock+=4000;$tasks->run($id);}
checkCommerce($tasks->calls===10&&Db::name('commerce_task')->where('id',$id)->value('state')==='dead','retry budget ends in visible terminal state');
$tasks->fail=false;$tasks->stage('order',2,'notice_user');$id=(int)Db::name('commerce_task')->where('business_id',2)->value('id');
$claim=$tasks->claimForTest($id);$tasks->run($id);checkCommerce($tasks->calls===10,'live lease prevents a second worker');
$tasks->clock+=601;$tasks->run($id);checkCommerce(Db::name('commerce_task')->where('id',$id)->value('state')==='done','expired lease recovers after worker crash');
$tasks->stage('order',3,'notice_user');$id=(int)Db::name('commerce_task')->where('business_id',3)->value('id');
$tasks->inside=function($row)use($tasks,$id){$tasks->clock+=601;$claim=$tasks->claimForTest($id);checkCommerce($claim['lease_token']!==$row['lease_token'],'each ownership lease has a fresh token');};
checkCommerce(!$tasks->run($id)&&Db::name('commerce_task')->where('id',$id)->value('state')==='running','stale worker cannot acknowledge successor lease');
$tasks->stage('order',4,'late_payment_review');$id=(int)Db::name('commerce_task')->where('business_id',4)->value('id');$tasks->terminal=true;$tasks->run($id);
checkCommerce(Db::name('commerce_task')->where('id',$id)->value('state')==='dead','manual-review outcome stops automatic execution');
class HealthProbe extends app\services\system\CommerceHealthServices {protected function queueSize():int{return 1500;}}
$health=(new HealthProbe)->summary();
checkCommerce(!$health['healthy']&&count($health['alerts'])>=2&&$health['queue']['size']===1500,'health reports terminal tasks and queue backlog');
echo "Lease/backoff/monitor checks passed.\n";
