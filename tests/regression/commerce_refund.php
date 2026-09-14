<?php
require __DIR__.'/commerce_bootstrap.php';
use think\facade\Db;
use app\services\pay\RechargeRefundGateway;
use app\services\pay\RechargeRefundServices;
use app\services\system\CommerceTaskServices;
hardeningSchema();
Db::execute('CREATE TABLE IF NOT EXISTS eb_audit_refund_provider (refund_no VARCHAR(64) PRIMARY KEY, calls INT DEFAULT 0, queries INT DEFAULT 0, state VARCHAR(20)) ENGINE=InnoDB');
class RefundProviderFixture extends RechargeRefundGateway {
    public $timeout=false;public $outcome='succeeded';public $duringQuery;
    public function send(array $attempt,array $order): void {
        checkCommerce(!Db::connect()->getPdo()->inTransaction(),'refund send outside transaction');
        $row=Db::name('audit_refund_provider')->where('refund_no',$attempt['refund_no'])->find();
        if(!$row)Db::name('audit_refund_provider')->insert(['refund_no'=>$attempt['refund_no'],'calls'=>1,'state'=>$this->outcome]);
        else Db::name('audit_refund_provider')->where('refund_no',$attempt['refund_no'])->inc('calls')->update();
        if($this->timeout)throw new RuntimeException('Synthetic timeout after provider accepted');
    }
    public function query(array $attempt,array $order): array {
        checkCommerce(!Db::connect()->getPdo()->inTransaction(),'refund query outside transaction');
        if($this->duringQuery){$fn=$this->duringQuery;$this->duringQuery=null;$fn();}
        $row=Db::name('audit_refund_provider')->where('refund_no',$attempt['refund_no'])->find();
        if(!$row)return ['state'=>'not_found'];
        Db::name('audit_refund_provider')->where('refund_no',$attempt['refund_no'])->inc('queries')->update();
        return ['state'=>$row['state'],'reference'=>'synthetic-provider'];
    }
}
$gateway=new RefundProviderFixture;app()->instance(RechargeRefundGateway::class,$gateway);
function paidRefundFixture(){hardeningReset();Db::name('audit_refund_provider')->where('1=1')->delete();rechargeFixture(1,'50.00','5.00');Db::name('user_recharge')->where('id',1)->update(['paid'=>1,'trade_no'=>'synthetic']);Db::name('user')->where('uid',101)->update(['now_money'=>'55.00']);}
function retryRefundTasks(){Db::name('commerce_task')->where('state','retry')->update(['next_attempt_at'=>0]);app()->make(CommerceTaskServices::class)->tick();}
$service=app()->make(RechargeRefundServices::class);
paidRefundFixture();$gateway->timeout=true;
$first=$service->request(1,true);
checkCommerce($first['state']==='unknown'&&moneyValue()==='0.00','timeout reserves principal and gift and retains unknown result');
checkCommerce(Db::name('user_recharge')->where('id',1)->value('refund_price')==='0.00','unknown outcome never claims refunded');
$gateway->timeout=false;retryRefundTasks();
checkCommerce(Db::name('recharge_refund_attempt')->value('state')==='succeeded'&&Db::name('user_recharge')->where('id',1)->value('refund_price')==='50.00','query resolves accepted refund and completes local accounting');
checkCommerce(Db::name('audit_refund_provider')->value('calls')===1&&Db::name('audit_refund_provider')->value('queries')===1,'retry queries original refund instead of sending another');
$service->request(1,true);checkCommerce(Db::name('user_money')->count()===1&&Db::name('capital_flow')->count()===1,'duplicate request does not deduct balance or write capital flow again');
rejectedCommerce(function()use($service){$service->request(1,false);},'retry cannot change gift policy');
paidRefundFixture();Db::name('user')->where('uid',101)->update(['now_money'=>'49.00']);
rejectedCommerce(function()use($service){$service->request(1,false);},'insufficient balance rejects before provider contact');
checkCommerce(Db::name('recharge_refund_attempt')->count()===0&&Db::name('audit_refund_provider')->count()===0,'insufficient refund creates no intent or remote request');
paidRefundFixture();$gateway->outcome='failed';$service->request(1,true);
checkCommerce(moneyValue()==='55.00'&&Db::name('recharge_refund_attempt')->value('state')==='failed'&&Db::name('user_money')->count()===2,'confirmed closure releases reservation once with matching ledgers');
$service->request(1,true);checkCommerce(moneyValue()==='55.00'&&Db::name('user_money')->count()===2,'closed refund retry never releases twice');
paidRefundFixture();$gateway->outcome='succeeded';
// Fail local finalization after provider confirmation by rejecting capital-flow writes.
Db::execute("CREATE TRIGGER audit_reject_capital BEFORE INSERT ON eb_capital_flow FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic capital outage'");
$service->request(1,false);
checkCommerce(moneyValue()==='5.00'&&Db::name('recharge_refund_attempt')->value('state')==='unknown','local accounting failure preserves reservation and recoverable state');
Db::execute('DROP TRIGGER audit_reject_capital');retryRefundTasks();
checkCommerce(Db::name('recharge_refund_attempt')->value('state')==='succeeded'&&Db::name('audit_refund_provider')->value('calls')===1,'local accounting retry queries and never repeats remote refund');
checkCommerce(moneyValue()==='5.00'&&Db::name('capital_flow')->count()===1,'principal-only refund preserves gift and records one outgoing flow');
$attempt=['driver'=>'v3_wechat_pay','refund_no'=>'same-key','principal'=>'50.00'];
checkCommerce(RechargeRefundGateway::interpret($attempt,['status'=>'SUCCESS','out_refund_no'=>'other-key','amount'=>['refund'=>5000]])['state']==='unknown','foreign provider refund ID never completes local refund');
checkCommerce(RechargeRefundGateway::interpret($attempt,['status'=>'SUCCESS','out_refund_no'=>'same-key','amount'=>['refund'=>4999]])['state']==='unknown','provider amount mismatch never completes local refund');
checkCommerce(RechargeRefundGateway::interpret($attempt,['status'=>'SUCCESS','out_refund_no'=>'same-key','amount'=>['refund'=>5000]])['state']==='succeeded','matching provider identity amount and success accepted');
echo "Refund recovery checks passed.\n";
