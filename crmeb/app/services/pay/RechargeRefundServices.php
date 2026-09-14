<?php
namespace app\services\pay;

use app\services\BaseServices;
use app\services\user\UserRechargeServices;
use app\services\user\UserServices;
use app\services\user\UserMoneyServices;
use app\services\system\CommerceTaskServices;
use crmeb\exceptions\AdminException;
use think\facade\Db;

class RechargeRefundServices extends BaseServices
{
    public function request(int $rechargeId, bool $reclaimGift): array
    {
        $id=$this->transaction(function()use($rechargeId,$reclaimGift){
            $recharge=app()->make(UserRechargeServices::class)->getOneForUpdate(['id'=>$rechargeId]);
            if (!$recharge || !$recharge['paid'] || $recharge['recharge_type']==='balance') throw new AdminException('请选择已支付的渠道充值记录');
            $existing=Db::name('recharge_refund_attempt')->where('recharge_id',$rechargeId)->lock(true)->find();
            $gift=$reclaimGift?(string)$recharge['give_price']:'0.00';
            if ($existing) {
                if (bccomp($gift,$existing['gift'],2)!==0) throw new AdminException('退款处理中不能改变赠送金规则');
                app()->make(CommerceTaskServices::class)->afterCommit('recharge_refund',(int)$existing['id']);
                return (int)$existing['id'];
            }
            if (bccomp((string)$recharge['refund_price'],'0',2)>0) throw new AdminException('历史退款记录请先核对，不可重复退款');
            $principal=(string)$recharge['price']; $reserved=bcadd($principal,$gift,2);
            if (bccomp($principal,'0',2)<=0) throw new AdminException('可退本金必须大于零');
            $users=app()->make(UserServices::class);
            $user=$users->getOneForUpdate(['uid'=>$recharge['uid']]);
            if (!$user || bccomp((string)$user['now_money'],$reserved,2)<0) throw new AdminException('余额不足以预留退款本金及所选赠送金额');
            $driver=$recharge['recharge_type']==='alipay'?'ali_pay':($recharge['recharge_type']==='allinpay'?'allin_pay':(sys_config('pay_wechat_type')?'v3_wechat_pay':'wechat_pay'));
            if (sys_config('pay_new_weixin_open') && $driver==='wechat_pay' && $recharge['recharge_type']!=='weixin') throw new AdminException('该小程序退款渠道需先配置可查询的退款适配器');
            $no='cr'.$rechargeId.'_'.bin2hex(random_bytes(12));
            $id=Db::name('recharge_refund_attempt')->insertGetId(['recharge_id'=>$rechargeId,'uid'=>$recharge['uid'],
                'refund_no'=>$no,'driver'=>$driver,'principal'=>$principal,'gift'=>$gift,'reserved'=>$reserved,
                'payload'=>json_encode($recharge->toArray(),JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),'created_at'=>time(),'updated_at'=>time()]);
            if (!$users->bcDec($recharge['uid'],'now_money',$reserved,'uid')) throw new AdminException('退款预留失败');
            if (!app()->make(UserMoneyServices::class)->income('recharge_refund_reserve',$recharge['uid'],$reserved,bcsub((string)$user['now_money'],$reserved,2),$id)) throw new AdminException('退款预留流水写入失败');
            $tasks=app()->make(CommerceTaskServices::class); $tasks->stage('recharge_refund',$id,'reconcile'); $tasks->afterCommit('recharge_refund',$id);
            return $id;
        });
        $row=Db::name('recharge_refund_attempt')->where('id',$id)->find();
        return ['id'=>$id,'refund_no'=>$row['refund_no'],'state'=>$row['state'],'principal'=>$row['principal'],'gift'=>$row['gift']];
    }

    /** Executed only by a leased commerce task. Do not call a provider while holding account/order locks. */
    public function process(int $id): bool
    {
        $attempt=Db::name('recharge_refund_attempt')->where('id',$id)->find();
        if (!$attempt) throw new \RuntimeException('Refund attempt missing');
        if (in_array($attempt['state'],['succeeded','failed'],true)) return true;
        if (Db::connect()->getPdo()->inTransaction()) throw new \LogicException('Refund transport must run after commit');
        $order=json_decode($attempt['payload'],true,512,JSON_THROW_ON_ERROR);
        $gateway=app()->make(RechargeRefundGateway::class);
        try {
            if ($attempt['state']==='prepared') {
                // Persist intent before sending. Crash/timeout leaves an unknown result for query, never a fresh refund number.
                if (!Db::name('recharge_refund_attempt')->where('id',$id)->where('state','prepared')->update(['state'=>'unknown','updated_at'=>time()])) throw new \RuntimeException('Refund was claimed by another operation');
                $gateway->send($attempt,$order);
            }
            $result=$gateway->query($attempt,$order);
            if ($result['state']==='not_found') {
                $gateway->send($attempt,$order);
                throw new \RuntimeException('Refund resubmitted with original key after not-found query; awaiting confirmation');
            }
            if (!in_array($result['state'],['succeeded','failed'],true)) throw new \RuntimeException('Refund outcome unknown; query again before any resend');
            $this->finish($id,$result['state'],$result['reference']??'');
            return true;
        } catch (\Throwable $error) {
            Db::name('recharge_refund_attempt')->where('id',$id)->whereNotIn('state',['succeeded','failed'])->update(['state'=>'unknown','last_error'=>mb_substr($error->getMessage(),0,1000),'updated_at'=>time()]);
            throw $error;
        }
    }

    protected function finish(int $id, string $state, string $reference): void
    {
        $this->transaction(function()use($id,$state,$reference){
            $initial=Db::name('recharge_refund_attempt')->where('id',$id)->find();
            $recharges=app()->make(UserRechargeServices::class);
            $order=$recharges->getOneForUpdate(['id'=>$initial['recharge_id']]);
            $attempt=Db::name('recharge_refund_attempt')->where('id',$id)->lock(true)->find();
            if (in_array($attempt['state'],['succeeded','failed'],true)) return;
            if ($state==='succeeded') {
                if (!$recharges->update($order['id'],['refund_price'=>$attempt['principal']])) throw new \RuntimeException('Refund accounting update failed');
                $data=json_decode($attempt['payload'],true); $user=app()->make(UserServices::class)->getOneForUpdate(['uid'=>$attempt['uid']]);
                $data['nickname']=$user['nickname'];$data['phone']=$user['phone'];
                app()->make(\app\services\statistic\CapitalFlowServices::class)->setFlow($data,'refund_recharge');
            } else {
                $users=app()->make(UserServices::class);$user=$users->getOneForUpdate(['uid'=>$attempt['uid']]);
                if (!$users->bcInc($attempt['uid'],'now_money',$attempt['reserved'],'uid') || !app()->make(UserMoneyServices::class)->income('recharge_refund_release',$attempt['uid'],$attempt['reserved'],bcadd((string)$user['now_money'],$attempt['reserved'],2),$id)) throw new \RuntimeException('Refund reservation release failed');
            }
            Db::name('recharge_refund_attempt')->where('id',$id)->update(['state'=>$state,'remote_reference'=>$reference,'last_error'=>'','updated_at'=>time()]);
        });
    }
}
