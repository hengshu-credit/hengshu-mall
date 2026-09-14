<?php
namespace app\services\system;

use app\services\BaseServices;
use app\services\user\UserServices;
use think\facade\Db;

/** A receipt and its local account effects commit together. Never wrap remote calls here. */
class CommerceOperationServices extends BaseServices
{
    public function once(string $key, string $kind, int $uid, string $amount, callable $work)
    {
        if ($uid<=0 || strlen($key)>190 || $key==='') throw new \InvalidArgumentException('Invalid account operation');
        return $this->transaction(function()use($key,$kind,$uid,$amount,$work){
            if (!app()->make(UserServices::class)->getOneForUpdate(['uid'=>$uid])) throw new \RuntimeException('Account missing');
            $old=Db::name('commerce_operation')->where('operation_key',$key)->lock(true)->find();
            if ($old) {
                if ($old['kind']!==$kind || (int)$old['uid']!==$uid || bccomp($old['amount'],$amount,2)!==0) throw new \RuntimeException('Operation key reused with different parameters');
                return (int)$old['result_id'];
            }
            $result=$work();
            if ($result===false) throw new \RuntimeException('Account operation failed');
            Db::name('commerce_operation')->insert(['operation_key'=>$key,'kind'=>$kind,'uid'=>$uid,'amount'=>$amount,'result_id'=>is_int($result)?$result:0,'created_at'=>time()]);
            return $result;
        });
    }
}
