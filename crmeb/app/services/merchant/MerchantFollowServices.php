<?php
namespace app\services\merchant;

use crmeb\exceptions\ApiException;
use think\facade\Db;

class MerchantFollowServices
{
    public function state(int $uid, int $shopId): array
    {
        MerchantInstaller::ensure();
        return ['followed'=>$uid > 0 && Db::name('merchant_follow')->where('uid',$uid)->where('shop_id',$shopId)->count() > 0,
            'follower_count'=>Db::name('merchant_follow')->where('shop_id',$shopId)->count()];
    }
    public function set(int $uid, int $shopId, bool $follow): array
    {
        if ($uid < 1) throw new ApiException('请先登录');
        MerchantInstaller::ensure();
        return Db::transaction(function () use ($uid,$shopId,$follow) {
            // Per-shop locking makes duplicate taps idempotent and orders concurrent follow/unfollow.
            $shop = Db::name('merchant_shop')->where('id',$shopId)->lock(true)->find();
            if ($follow && (!$shop || !(new MerchantServices())->available($shop))) throw new ApiException('店铺暂未营业，无法关注');
            $query = Db::name('merchant_follow')->where('uid',$uid)->where('shop_id',$shopId);
            if ($follow) { if (!(clone $query)->find()) Db::name('merchant_follow')->insert(['uid'=>$uid,'shop_id'=>$shopId,'created_at'=>time()]); }
            else $query->delete();
            return $this->state($uid,$shopId);
        });
    }
    public function listing(int $uid, int $page = 1, int $limit = 20): array
    {
        if ($uid < 1) throw new ApiException('请先登录');
        MerchantInstaller::ensure();
        $query = Db::name('merchant_follow')->where('uid',$uid);
        $count = (clone $query)->count();
        $rows = $query->order('created_at desc,id desc')->page(max(1,$page),min(50,max(1,$limit)))->select()->toArray();
        $shops = $rows ? Db::name('merchant_shop')->whereIn('id',array_column($rows,'shop_id'))->select()->toArray() : [];
        $map = array_column($shops,null,'id'); $list=[];
        foreach ($rows as $row) {
            $shop=$map[$row['shop_id']] ?? null;
            $profile=$shop ? MerchantVault::decrypt($shop['profile']) : [];
            $list[]=['id'=>(int)$row['shop_id'],'name'=>$shop['name'] ?? '店铺已不存在','logo'=>set_file_url($profile['logo'] ?? ''),
                'description'=>$profile['description'] ?? '', 'followed'=>true,'followed_at'=>(int)$row['created_at'],
                'available'=>$shop && (new MerchantServices())->available($shop)];
        }
        return ['list'=>$list,'count'=>$count];
    }
}
