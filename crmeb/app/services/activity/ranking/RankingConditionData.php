<?php
declare(strict_types=1);
namespace app\services\activity\ranking;

use think\facade\Db;
use app\services\merchant\MerchantVault;
use app\services\activity\fullreduction\FullReductionInstaller;
use app\services\activity\fullreduction\FullReductionCalculator;

/** Resolve only fields used by the tree; these contexts are never returned to storefronts. */
class RankingConditionData
{
    public static function customer(int $uid): array
    {
        if(!$uid)return ['logged_in'=>0];
        $user=Db::name('user')->where('uid',$uid)->where('is_del',0)->field('uid,nickname,group_id,level,status,integral,exp,now_money,pay_count,user_type,is_promoter,add_time,last_time')->find();
        if(!$user)return ['logged_in'=>0];
        $user['logged_in']=1;
        $user['label_ids']=array_map('intval',Db::name('user_label_relation')->where('uid',$uid)->whereIn('label_id',function($q){$q->name('user_label')->field('id');})->column('label_id'));
        return $user;
    }
    private static function ids($value): array
    {
        $json=is_string($value)?json_decode($value,true):null;
        return array_values(array_filter(array_map('intval',is_array($value)?$value:(is_array($json)?$json:explode(',',(string)$value)))));
    }
    public static function enrich(array $data,array $rule,array $customer,int $now): array
    {
        if(empty($rule['condition_tree']))return $data;
        $fields=array_column(RankingConditionTree::leaves($rule['condition_tree']),'field');
        $needsProduct=(bool)array_filter($fields,function($field){return strpos($field,'product.')===0;});
        $needsShop=(bool)array_filter($fields,function($field){return strpos($field,'shop.')===0;});
        $shops=array_column($data['shop'],null,'id');$products=array_column($data['product'],null,'id');
        if($needsShop&&$shops){
            foreach(Db::name('merchant_shop')->whereIn('id',array_keys($shops))->field('id,profile,state,audit_status,is_platform,created_at')->select()->toArray() as $row){
                $profile=MerchantVault::decrypt($row['profile']);unset($row['profile']);
                $shops[$row['id']]=array_replace($shops[$row['id']],$row,array_intersect_key($profile,array_flip(['tag_ids','description','subject_kind','business_scope','business_address','registered_address'])));
                $shops[$row['id']]['tag_ids']=self::ids($shops[$row['id']]['tag_ids']??[]);
            }
        }
        if($needsProduct&&$products){
            $columns='id,store_info,keyword,bar_code,spu,unit_name,add_time,is_show,is_new,is_hot,is_best,is_benefit,is_postage,is_virtual,vip_product,spec_type,protection_list,params_list,presale,presale_start_time,presale_end_time';
            foreach(Db::name('store_product')->whereIn('id',array_keys($products))->field($columns)->select()->toArray() as $row){
                $row['protection_ids']=self::ids($row['protection_list']);$row['attributes']=[];
                foreach(json_decode($row['params_list'],true)?:[] as $pair)if(is_array($pair)&&isset($pair['name'],$pair['value']))$row['attributes'][$pair['name']][]=(string)$pair['value'];
                unset($row['protection_list'],$row['params_list']);$products[$row['id']]=array_replace($products[$row['id']],$row);
            }
            if(in_array('product.spec',$fields,true))foreach(Db::name('store_product_attr')->whereIn('product_id',array_keys($products))->where('type',0)->select()->toArray() as $attr){
                $values=json_decode($attr['attr_values'],true);if(!is_array($values))$values=explode(',',$attr['attr_values']);
                $products[$attr['product_id']]['spec'][$attr['attr_name']]=array_map('strval',$values);
            }
            $activityFields=['product.activity_types','product.seckill_ids','product.bargain_ids','product.combination_ids','product.full_reduction_ids'];
            if(array_intersect($fields,$activityFields))self::activities($products,$customer,$now);
        }
        foreach($products as &$product)$product['_shop']=$shops[$product['shop_id']]??[];unset($product);
        foreach($shops as &$shop)$shop['_products']=[];unset($shop);
        foreach($products as $product)if(isset($shops[$product['shop_id']]))$shops[$product['shop_id']]['_products'][]=$product;
        return ['product'=>array_values($products),'shop'=>array_values($shops)];
    }
    private static function activities(array &$products,array $customer,int $now): void
    {
        foreach($products as &$product){$product['activity_types']=[];foreach(['seckill','bargain','combination','full_reduction'] as $type)$product[$type.'_ids']=[];
            if(!empty($product['presale'])&&$product['presale_start_time']<=$now&&$product['presale_end_time']>$now)$product['activity_types'][]='presale';
        }unset($product);
        foreach(['seckill'=>'status','bargain'=>'status','combination'=>'is_show'] as $type=>$status){
            $query=Db::name('store_'.$type)->whereIn('product_id',array_keys($products))->where('is_del',0)->where($status,1)->where('start_time','<=',$now);
            // Seckill dates include the last calendar day, matching the existing mall's activity model.
            $query->where('stop_time','>',$type==='seckill'?$now-86400:$now);
            if($type==='seckill')$query->where('is_show',1);
            foreach($query->field('id,product_id')->select()->toArray() as $activity){$products[$activity['product_id']][$type.'_ids'][]=(int)$activity['id'];$products[$activity['product_id']]['activity_types'][]=$type;}
        }
        FullReductionInstaller::ensureSchema();
        foreach(Db::name('store_full_reduction')->where('is_del',0)->where('status',1)->where('start_time','<=',$now)->where('end_time','>',$now)->select()->toArray() as $activity){
            foreach(['product_ids','member_ids','level_ids'] as $key)$activity[$key]=json_decode($activity[$key],true)?:[];
            if(empty($customer['logged_in'])||!FullReductionCalculator::eligibleMember($activity,$customer))continue;
            foreach($products as &$product){
                $included=in_array($product['id'],$activity['product_ids']);
                if(!empty($product['presale'])||((int)$activity['range_type']===3&&!$included)||((int)$activity['range_type']===4&&$included))continue;
                $product['full_reduction_ids'][]=(int)$activity['id'];$product['activity_types'][]='full_reduction';
            }unset($product);
        }
    }
}
