<?php
namespace app\services\system;

use app\model\system\CommerceTask;
use crmeb\utils\AfterCommit;

/** Transactional outbox. Remote work never runs inside a row-locking transaction. */
class CommerceTaskServices
{
    const MAX_ATTEMPTS = 10;
    const LEASE_SECONDS = 600;

    protected function query() { return (new CommerceTask())->db(); }
    protected function now(): int { return time(); }
    protected function atomic(callable $work) { return $this->query()->getConnection()->transaction($work); }

    /** Call inside the business transaction. The unique key also survives completed delivery. */
    public function stage(string $kind, int $id, string $step, array $payload = []): string
    {
        if ($id <= 0 || !preg_match('/^[a-z_]{1,32}$/D', $kind) || !preg_match('/^[a-z0-9_:]{1,64}$/D', $step)) {
            throw new \InvalidArgumentException('Invalid commerce task');
        }
        $key = $kind . ':' . $id . ':' . $step;
        $row = ['task_key'=>$key,'kind'=>$kind,'business_id'=>$id,'step'=>$step,
            'payload'=>json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
            'created_at'=>$this->now(),'updated_at'=>$this->now()];
        // Duplicate keys are expected during callback/import recovery; other SQL errors must propagate.
        try { $this->query()->insert($row); }
        catch (\think\db\exception\PDOException $error) {
            if (strpos($error->getMessage(),'Duplicate entry')===false || !$this->query()->where('task_key',$key)->find()) throw $error;
        }
        return $key;
    }

    public function afterCommit(string $kind, int $id): void
    {
        AfterCommit::defer(function()use($kind,$id) { $this->runBusiness($kind,$id); });
    }

    /** Nonthrowing delivery: database payment completion is independent of notification availability. */
    public function runBusiness(string $kind, int $id): void
    {
        foreach ($this->query()->where('kind',$kind)->where('business_id',$id)->whereIn('state',['pending','retry','running'])->order('id')->column('id') as $taskId) {
            $this->run((int)$taskId);
        }
    }

    protected function claim(int $id): ?array
    {
        return $this->atomic(function()use($id){
            $row=$this->query()->where('id',$id)->lock(true)->find(); $now=$this->now();
            if (!$row || in_array($row['state'],['done','dead'],true) || $row['next_attempt_at']>$now || ($row['state']==='running' && $row['lease_until']>$now)) return null;
            if ($row instanceof \think\Model) $row=$row->toArray();
            if ($row['attempts']>=self::MAX_ATTEMPTS) {
                $this->query()->where('id',$id)->update(['state'=>'dead','lease_until'=>0,'lease_token'=>'','updated_at'=>$now,'last_error'=>'Maximum attempts reached; inspect remote outcome before manual resolution']);
                return null;
            }
            $row['lease_token']=bin2hex(random_bytes(24)); $row['attempts']++;
            $this->query()->where('id',$id)->update(['state'=>'running','attempts'=>$row['attempts'],
                'lease_token'=>$row['lease_token'],'lease_until'=>$now+self::LEASE_SECONDS,'updated_at'=>$now]);
            return $row;
        });
    }

    public function run(int $id): bool
    {
        // Publishing from a nested transaction would violate visibility and lock guarantees.
        if ($this->query()->getConnection()->getPdo()->inTransaction()) throw new \LogicException('Commerce delivery must run after commit');
        $row=$this->claim($id);
        if (!$row) return false;
        try {
            $payload=json_decode($row['payload'],true,512,JSON_THROW_ON_ERROR);
            \app\services\order\OrderPaymentDispatchServices::guardDelivery(function()use($row,$payload){return $this->deliver($row,$payload);});
            return (bool)$this->query()->where('id',$id)->where('state','running')->where('lease_token',$row['lease_token'])
                ->update(['state'=>'done','lease_until'=>0,'lease_token'=>'','last_error'=>'','updated_at'=>$this->now(),'finished_at'=>$this->now()]);
        } catch (\Throwable $error) {
            $terminal=$error instanceof CommerceTaskNeedsReview || $row['attempts']>=self::MAX_ATTEMPTS;
            $this->query()->where('id',$id)->where('state','running')->where('lease_token',$row['lease_token'])->update([
                'state'=>$terminal?'dead':'retry','lease_until'=>0,'lease_token'=>'','updated_at'=>$this->now(),
                'next_attempt_at'=>$this->now()+min(3600,5*(2 ** min(10,$row['attempts']-1))),
                'last_error'=>mb_substr(get_class($error).': '.$error->getMessage(),0,1000)]);
            return false;
        }
    }

    protected function deliver(array $row, array $payload)
    {
        switch ($row['kind']) {
            case 'order': return app()->make(\app\services\order\OrderPaymentDispatchServices::class)->deliverTask($row['step'],(int)$row['business_id'],$row['task_key']);
            case 'recharge': return app()->make(\app\services\user\UserRechargeServices::class)->deliverPaidTask($row['step'],$payload,$row['task_key']);
            case 'member': return app()->make(\app\services\order\OtherOrderServices::class)->deliverPaidTask($row['step'],$payload,$row['task_key']);
            case 'recharge_refund': return app()->make(\app\services\pay\RechargeRefundServices::class)->process((int)$row['business_id']);
        }
        throw new \RuntimeException('Unknown commerce task kind');
    }

    public function tick(int $limit = 100): array
    {
        $now=$this->now();
        $ids=$this->query()->where(function($q)use($now){
            $q->where(function($p)use($now){$p->whereIn('state',['pending','retry'])->where('next_attempt_at','<=',$now);})
                ->whereOr(function($p)use($now){$p->where('state','running')->where('lease_until','<=',$now);});
        })->order('id')->limit(min(500,max(1,$limit)))->column('id');
        $done=0; foreach($ids as $id) if($this->run((int)$id))$done++;
        return ['examined'=>count($ids),'completed'=>$done];
    }

    public function summary(): array
    {
        $now=$this->now();
        return ['states'=>$this->query()->field('state,COUNT(*) AS count,MIN(created_at) AS oldest')->group('state')->select()->toArray(),
            'expired_leases'=>$this->query()->where('state','running')->where('lease_until','<=',$now)->count(),
            'overdue'=>$this->query()->whereIn('state',['pending','retry'])->where('created_at','<',$now-300)->count()];
    }
}
