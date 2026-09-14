<?php
/** Dedicated test DB only. Never load the application's installed environment. */
require dirname(__DIR__,2).'/crmeb/vendor/autoload.php';
if (getenv('CRMEB_AUDIT_DATABASE')!=='crmeb_hardening_test') throw new RuntimeException('Requires isolated crmeb_hardening_test');
$testApp=new think\App(dirname(__DIR__,2).'/crmeb/');
$testApp->setRuntimePath(sys_get_temp_dir().'/crmeb-hardening-'.getmypid().'/');
think\Container::setInstance($testApp);
function app($name=null){global $testApp;return $name===null?$testApp:$testApp->make($name);}
function getLang($message,$replace=[]){return $message;}
function sys_config($name,$default=null){global $testSettings;return $testSettings[$name]??$default;}
function event($name,$args=[]){if(getenv('AUDIT_FAIL_EVENT'))throw new RuntimeException('Synthetic event failure');}
function is_brokerage_statu($price){return false;}
function config($name,$default=null){return app()->config->get($name,$default);}
$testSettings=[];
$db=new think\DbManager;
$db->setConfig(['default'=>'mysql','connections'=>['mysql'=>['type'=>'mysql','hostname'=>'127.0.0.1',
    'hostport'=>(int)(getenv('CRMEB_AUDIT_PORT')?:3306),'database'=>'crmeb_hardening_test','username'=>'root','password'=>'audit-only-password',
    'charset'=>'utf8mb4','prefix'=>'eb_','fields_strict'=>true,'break_reconnect'=>false]]]);
$testApp->instance('db',$db);think\Model::setDb($db);
$testApp->config->set(['default'=>'file','stores'=>['file'=>['type'=>'File','path'=>sys_get_temp_dir().'/crmeb-hardening-cache/']]],'cache');
use think\facade\Db;
class TestCommerceTasks extends app\services\system\CommerceTaskServices {
    protected function deliver(array $row,array $payload) {
        if (Db::connect()->getPdo()->inTransaction()) throw new RuntimeException('Remote work under DB transaction');
        if ($row['kind']==='recharge_refund') return parent::deliver($row,$payload);
        if (getenv('AUDIT_FAIL_DELIVERY')) throw new RuntimeException('Synthetic delivery failure');
        Db::name('audit_delivery')->insert(['task_key'=>$row['task_key']]);
        return true;
    }
}
class TestMoneyLog extends app\services\user\UserMoneyServices {
    public function income(string $type,int $uid,$number,$balance,$linkId,string $mark='') {
        if (getenv('AUDIT_FAIL_LEDGER')) throw new RuntimeException('Synthetic ledger failure');
        return parent::income($type,$uid,$number,$balance,$linkId,$mark);
    }
}
class TestMemberLog extends app\services\user\UserBillServices {
    public function income(string $type,int $uid,$number,$balance,$linkId) {
        if (getenv('AUDIT_FAIL_LEDGER')) throw new RuntimeException('Synthetic member ledger failure');
        return parent::income($type,$uid,$number,$balance,$linkId);
    }
}
$testApp->instance(app\services\system\CommerceTaskServices::class,new TestCommerceTasks);
$testApp->instance(app\services\user\UserMoneyServices::class,new TestMoneyLog(new app\dao\user\UserMoneyDao));
$testApp->instance(app\services\user\UserBillServices::class,new TestMemberLog(new app\dao\user\UserBillDao));
function hardeningSchema(){
    $sql=file_get_contents(dirname(__DIR__,2).'/crmeb/public/install/crmeb.sql');
    foreach(['system_menus','system_role','system_admin','user','user_money','user_bill','user_brokerage','user_extract','user_recharge','other_order','other_order_status','capital_flow','store_order','store_order_status','store_order_cart_info','store_product','store_product_attr_value'] as $table){
        if(!preg_match('/CREATE TABLE IF NOT EXISTS `eb_'.$table.'`.*?;/s',$sql,$m))throw new RuntimeException('Missing fixture table '.$table);
        Db::execute($m[0]);
    }
    foreach(explode(';',file_get_contents(dirname(__DIR__,2).'/crmeb/upgrade/commerce_reliability.sql'))as $stmt)if(trim($stmt))Db::execute($stmt);
    Db::execute('CREATE TABLE IF NOT EXISTS eb_audit_delivery (id INT AUTO_INCREMENT PRIMARY KEY, task_key VARCHAR(190)) ENGINE=InnoDB');
}
function hardeningReset(){
    foreach(['user','user_money','user_bill','user_brokerage','user_extract','user_recharge','other_order','other_order_status','capital_flow','commerce_task','commerce_operation','recharge_refund_attempt','audit_delivery']as $table)Db::name($table)->where('1=1')->delete();
    Db::name('user')->insert(['uid'=>101,'nickname'=>'synthetic','phone'=>'','now_money'=>'0.00','brokerage_price'=>'200.00','integral'=>'100.00','user_type'=>'h5','is_money_level'=>0,'overdue_time'=>0]);
}
function checkCommerce($condition,$name){if(!$condition)throw new RuntimeException('FAIL: '.$name);echo 'PASS: '.$name.PHP_EOL;}
function rejectedCommerce(callable $work,$name){try{$work();}catch(Throwable $e){checkCommerce(true,$name);return;}throw new RuntimeException('FAIL: '.$name);}
function moneyValue(){return Db::name('user')->where('uid',101)->value('now_money');}
function rechargeFixture($id,$price='50.00',$gift='0.00') {Db::name('user_recharge')->insert(['id'=>$id,'uid'=>101,'order_id'=>'test-recharge-'.$id,'price'=>$price,'give_price'=>$gift,'recharge_type'=>'weixin','paid'=>0,'add_time'=>time()]);}
function memberFixture($id){Db::name('other_order')->insert(['id'=>$id,'uid'=>101,'order_id'=>'test-member-'.$id,'type'=>1,'vip_day'=>30,'member_type'=>'month','pay_price'=>'20.00','paid'=>0,'pay_type'=>'weixin','add_time'=>time()]);}
function parallelCommerce(array $actions,string $file='commerce_database.php'){
    $processes=[];
    foreach($actions as $args){$pipes=[];$process=proc_open(array_merge([PHP_BINARY,__DIR__.'/'.$file,'worker'],$args),[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);fclose($pipes[0]);$processes[]=[$process,$pipes];}
    foreach($processes as [$process,$pipes]){$text=stream_get_contents($pipes[1]);$err=stream_get_contents($pipes[2]);fclose($pipes[1]);fclose($pipes[2]);$code=proc_close($process);if($code!==0)throw new RuntimeException('Worker failed: '.$text.$err);}
}
