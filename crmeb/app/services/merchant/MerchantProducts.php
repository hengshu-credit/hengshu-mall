<?php
namespace app\services\merchant;

use crmeb\exceptions\AdminException;
use crmeb\exceptions\ApiException;
use think\facade\Db;

class MerchantProducts
{
    public static function constrain($query)
    {
        MerchantInstaller::ensure();
        $rows=Db::name('merchant_shop')->where('state','open')->where('audit_status','approved')->field('id,profile,subject_id')->select()->toArray();
        $subjectIds=array_filter(array_unique(array_column($rows,'subject_id')));
        $subjects=$subjectIds?Db::name('merchant_subject')->whereIn('id',$subjectIds)->column('profile','id'):[];
        $allowed=[];
        foreach ($rows as $row) {
            $profile=MerchantVault::decrypt($row['profile']);
            if (isset($subjects[$row['subject_id']])) $profile=array_replace($profile,MerchantVault::decrypt($subjects[$row['subject_id']]));
            if (MerchantData::valid($profile)) $allowed[]=(int)$row['id'];
        }
        return $query->where(function ($q) use ($allowed) {
            $q->whereIn('seller_shop_id',$allowed ?: [-1]);
            $q->whereOr(function ($unassigned) { $unassigned->where('seller_shop_id',0)->where('mer_id',0); });
        });
    }

    public static function assertOrderPayable(array $order): void
    {
        if (!empty($order['paid']) || isset($order['member_type'])) return;
        $snapshot=$order['merchant_snapshot'] ?? '';
        $merchants=is_array($snapshot)?$snapshot:json_decode((string)$snapshot,true);
        if (!$merchants) return;
        foreach ($merchants as $item) {
            if (isset($item['id']) && (int)$item['id'] === 0) continue;
            try { $row=(new MerchantServices())->rawShop((int)$item['id'], (bool)Db::connect()->getPdo()->inTransaction()); } catch (AdminException $e) { throw new ApiException('订单商户不可用，暂不能支付'); }
            if (!(new MerchantServices())->available($row)) throw new ApiException('订单商户已暂停营业或资料失效，暂不能支付');
        }
    }

    public static function prepare(array $data, int $productId): array
    {
        MerchantInstaller::ensure();
        $old=$productId?Db::name('store_product')->where('id',$productId)->lock(true)->find():null;
        if ($productId && !$old) throw new AdminException('商品不存在');
        if (array_key_exists('seller_shop_id',$data) && $data['seller_shop_id']!==null) {
            $owner=self::ownerInput($data['seller_shop_id']);
        } else $owner=$old?self::owner($old):0;
        $merchant=$owner?(new MerchantServices())->rawShop($owner,true):null;
        $changing=$old && $owner!==self::owner($old);
        if ($changing && (int)($data['merchant_version'] ?? 0)!==(int)($old['merchant_version'] ?? 0)) throw new AdminException('商品归属已被其他操作更新，请刷新后再修改');
        if ($merchant && !empty($data['is_show']) && !(new MerchantServices())->available($merchant)) throw new AdminException('所属商户未营业、未通过审核或证件已过期，商品只能保存为下架');
        if ($merchant && (!$old || $changing) && $merchant['state']==='closed') throw new AdminException('不能关联已关闭商户');
        $data['seller_shop_id']=$owner;
        $data['merchant_version']=(int)($old['merchant_version'] ?? 0)+($changing?1:0);
        $data['merchant_lock']=(!empty($data['is_show']) || !empty($old['merchant_lock']))?1:0;
        return $data;
    }

    public static function owner(array $product): int
    {
        if (!empty($product['seller_shop_id'])) return (int)$product['seller_shop_id'];
        if (empty($product['mer_id'])) return 0;
        throw new AdminException('商品历史商户归属尚未映射，请先处理迁移');
    }

    public static function summaries(array $products): array
    {
        MerchantInstaller::ensure();
        $ids=[];
        foreach ($products as $row) if (!empty($row['seller_shop_id'])) $ids[]=(int)$row['seller_shop_id'];
        $ids=array_unique($ids);
        $shops=$ids?Db::name('merchant_shop')->alias('m')->leftJoin('merchant_type t','t.id=m.type_id')->leftJoin('merchant_subject s','s.id=m.subject_id')->whereIn('m.id',$ids)->field('m.id,m.code,m.name,m.subject_id,m.version,m.state,m.audit_status,t.name AS type_name,s.name AS subject_name,s.version AS subject_version')->select()->toArray():[];
        $map=[];
        foreach ($shops as $row) $map[(int)$row['id']]=$row;
        foreach ($products as &$row) {
            $id=(int)($row['seller_shop_id'] ?? 0);
            $row['seller_shop_id']=$id;
            $row['merchant']=$map[$id] ?? ['id'=>$id,'name'=>$id || !empty($row['mer_id'])?'商户归属待处理':'未分配','type_name'=>'','subject_name'=>''];
            $row['merchant_name']=$row['merchant']['name'];
            $row['merchant_type_name']=$row['merchant']['type_name'];
        }
        return $products;
    }

    public static function assertPurchasable(int $productId): array
    {
        MerchantInstaller::ensure();
        $product=Db::name('store_product')->where('id',$productId)->find();
        if (!$product) throw new ApiException('商品不存在');
        try { $id=self::owner($product); $row=$id?(new MerchantServices())->rawShop($id):null; }
        catch (AdminException $e) { throw new ApiException('商品所属商户暂不可用'); }
        if ($row && !(new MerchantServices())->available($row)) throw new ApiException('商品所属商户已暂停营业或资料失效');
        return self::summaries([$product])[0]['merchant'];
    }

    /** Run inside order creation transaction. Consumer-facing snapshot contains no private documents. */
    public static function orderSnapshot(array &$cartInfo): array
    {
        $owners=[];
        foreach ($cartInfo as &$cart) {
            $productId=(int)($cart['product_id'] ?? $cart['productInfo']['id'] ?? 0);
            $product=Db::name('store_product')->where('id',$productId)->lock(true)->find();
            if (!$product) throw new ApiException('部分商品不存在');
            if (empty($product['is_show']) || !empty($product['is_del'])) throw new ApiException('部分商品已下架，请重新选择');
            try { $owner=self::owner($product); $merchant=$owner?(new MerchantServices())->rawShop($owner,true):null; }
            catch (AdminException $e) { throw new ApiException('商品归属尚未处理，暂不能下单'); }
            if ($merchant && !(new MerchantServices())->available($merchant)) throw new ApiException('部分商品所属商户暂停营业或资料失效');
            $summary=self::summaries([$product])[0]['merchant'];
            $cart['merchant']=$summary;
            $owners[$owner]=$summary;
        }
        unset($cart);
        return ['seller_shop_id'=>count($owners)===1?(int)key($owners):0,'merchant_snapshot'=>json_encode(array_values($owners),JSON_UNESCAPED_UNICODE)];
    }

    public static function ownerInput($value): int
    {
        if ($value === null || $value === '') return 0;
        if (is_bool($value) || filter_var($value,FILTER_VALIDATE_INT)===false || (int)$value<0) throw new AdminException('请选择有效的所属商户');
        return (int)$value;
    }
}
