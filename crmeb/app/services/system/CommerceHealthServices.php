<?php
namespace app\services\system;
use think\facade\Db;

class CommerceHealthServices
{
    protected function queueSize(): int { return (int)\think\facade\Queue::connection()->size(null); }
    public function summary(): array
    {
        $tasks=app()->make(CommerceTaskServices::class)->summary();
        $refunds=Db::name('recharge_refund_attempt')->whereIn('state',['prepared','unknown'])->count();
        $aged=Db::name('recharge_refund_attempt')->whereIn('state',['prepared','unknown'])->where('created_at','<',time()-300)->count();
        $queue=['available'=>true,'size'=>0];
        try {$queue['size']=$this->queueSize();}catch(\Throwable $e){$queue=['available'=>false,'size'=>null,'error'=>'队列连接不可用，请检查服务'];}
        $dead=0;foreach($tasks['states']as $row)if($row['state']==='dead')$dead+=(int)$row['count'];
        $alerts=[];
        if($tasks['overdue'])$alerts[]='支付或履约任务超过5分钟未完成';
        if($tasks['expired_leases'])$alerts[]='存在过期任务租约';
        if($dead)$alerts[]='任务重试已终止，需人工核对';
        if($aged)$alerts[]='充值退款结果超过5分钟未确认';
        if(!$queue['available'])$alerts[]='无法读取队列状态';
        if($queue['available']&&$queue['size']>=(int)(getenv('CRMEB_QUEUE_ALERT_LIMIT')?:1000))$alerts[]='队列积压超过阈值（包含等待、延迟与执行中任务）';
        return ['checked_at'=>time(),'healthy'=>!$alerts,'alerts'=>$alerts,'tasks'=>$tasks,'refund_unknown'=>$refunds,'refund_overdue'=>$aged,'queue'=>$queue];
    }
    public function listing(string $kind,int $page=1,int $limit=20): array
    {
        if($kind==='tasks')$q=Db::name('commerce_task')->field('id,kind,business_id,step,state,attempts,next_attempt_at,lease_until,last_error,created_at,updated_at');
        else $q=Db::name('recharge_refund_attempt')->field('id,recharge_id,refund_no,state,principal,gift,reserved,last_error,created_at,updated_at');
        $count=(clone $q)->count();
        return ['list'=>$q->order('updated_at desc,id desc')->page(max(1,$page),min(100,max(1,$limit)))->select()->toArray(),'count'=>$count];
    }
}
