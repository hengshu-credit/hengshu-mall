<?php
namespace app\services\merchant;

use crmeb\exceptions\AdminException;
use think\facade\Db;

class MerchantShopPages
{
    public static function options(string $keyword = ''): array
    {
        $query = Db::name('theme')->whereIn('page_type', ['merchant','shop'])->where('is_del', 0);
        if ($keyword !== '') $query->whereLike('title', '%' . mb_substr(trim($keyword), 0, 80) . '%');
        return $query->field('id,title')->order('id desc')->limit(100)->select()->toArray();
    }
    public static function validate(int $id): void
    {
        if ($id && !Db::name('theme')->where('id', $id)->whereIn('page_type', ['merchant','shop'])->where('is_del', 0)->lock(true)->find()) throw new AdminException('请选择装修中的商户主题');
    }
    public static function page(int $id): ?array
    {
        if (!$id) return null;
        $row = Db::name('theme')->where('id', $id)->whereIn('page_type', ['merchant','shop'])->where('is_del', 0)->find();
        if (!$row) return null;
        $page = json_decode($row['home_data'], true) ?: [];
        return $page ? ['id' => (int)$row['id'], 'title' => $row['title'], 'version' => $row['version'], 'config' => $page] : null;
    }
    public static function assertUnbound(int $pageId): void
    {
        MerchantInstaller::ensure();
        foreach (Db::name('merchant_shop')->field('id,name,profile')->select()->toArray() as $shop) {
            $profile = MerchantVault::decrypt($shop['profile']);
            if ((int)($profile['shop_page_id'] ?? 0) === $pageId) throw new AdminException('该页面已绑定商户“' . $shop['name'] . '”，请先解除绑定');
        }
    }
}
