<?php
require dirname(__DIR__,2).'/crmeb/vendor/autoload.php';
function config($name,$default=null){return $default;}
function app(){return new class {public function make($name){return new class {public function selectList($where){throw new RuntimeException('synthetic event-store unavailable');}};}};}
$notice=(new ReflectionClass(app\listener\notice\NoticeListener::class))->newInstanceWithoutConstructor();
$failures=[];
foreach(['notice'=>function()use($notice){$notice->handle([[],'order_pay_success']);},'custom_event'=>function(){(new app\listener\CustomEventListener)->handle(['order_pay',[]]);}]as $name=>$work){
    $failed=false;try{app\services\order\OrderPaymentDispatchServices::guardDelivery($work);}catch(RuntimeException $expected){$failed=true;}
    if(!$failed)$failures[]=$name;else echo 'PASS: caught '.$name.' failure remains an unacknowledged delivery'.PHP_EOL;
}
if($failures){echo 'FAIL: '.implode(',',$failures).PHP_EOL;exit(1);}
