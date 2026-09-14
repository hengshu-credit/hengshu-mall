<?php
// Bridge historical payment suites to the durable outbox; transport boundaries remain unchanged.
class HistoricalPaymentTasks extends app\services\system\CommerceTaskServices {
    protected function query(){return $GLOBALS['db']->table('audit_commerce_tasks');}
    protected function deliver(array $row,array $payload){return app()->make(app\services\order\OrderPaymentDispatchServices::class)->deliverTask($row['step'],(int)$row['business_id'],$row['task_key']);}
}
$outboxSql=explode(';',file_get_contents(dirname(__DIR__,2).'/crmeb/upgrade/commerce_reliability.sql'))[0];
$db->execute(str_replace('eb_commerce_task','audit_commerce_tasks',$outboxSql));
$historicalTasks=new HistoricalPaymentTasks;
if($container instanceof PaymentContainer)$container->instances[app\services\system\CommerceTaskServices::class]=$historicalTasks;
else $container->instance(app\services\system\CommerceTaskServices::class,$historicalTasks);
function dueHistoricalTasks(){global $db;$db->table('audit_commerce_tasks')->where('state','retry')->update(['next_attempt_at'=>0]);}
