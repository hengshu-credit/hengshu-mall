<?php
namespace app\services\product\product;

use crmeb\exceptions\AdminException;
use crmeb\services\CacheService;
use think\facade\Db;

/** Shared by admin navigation, brand services and the upgrade command. */
class ProductBrandInstaller
{
    private const MENUS = [
        'admin-product-brand-list' => 1,
        'admin-product-brand-save' => 3,
        'admin-product-brand-status' => 3,
        'admin-product-brand-delete' => 3,
        'product-brand-list-api' => 2,
        'product-brand-info-api' => 2,
        'product-brand-save-api' => 2,
        'product-brand-status-api' => 2,
        'product-brand-delete-api' => 2,
    ];

    private static function statements(bool $schema): array
    {
        $prefix = (string)Db::connect()->getConfig('prefix');
        if (!preg_match('/^[a-zA-Z0-9_]*$/D', $prefix)) throw new AdminException('数据库表前缀不正确');
        $file = app()->getRootPath() . 'upgrade/product_brands.sql';
        if (!is_readable($file)) throw new AdminException('商品品牌初始化 SQL 文件缺失');
        $sql = str_replace('`eb_', '`' . $prefix, file_get_contents($file));
        return array_values(array_filter(array_map('trim', explode(';', $sql)), function ($statement) use ($schema) {
            return $statement !== '' && (stripos($statement, 'CREATE TABLE') === 0) === $schema;
        }));
    }

    public static function ensureSchema(): void
    {
        $connection = Db::connect();
        $prefix = (string)$connection->getConfig('prefix');
        $tables = array_map(function ($name) use ($prefix) { return $prefix . $name; }, [
            'store_product_brand', 'store_product_brand_cate', 'store_product_brand_relation',
        ]);
        $existing = $connection->query('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?, ?, ?)', $tables, true);
        if (count($existing) === count($tables)) return;

        // MySQL DDL implicitly commits. Never repair schema inside a product transaction.
        $pdo = $connection->getPdo();
        if ($pdo && $pdo->inTransaction()) throw new AdminException('商品品牌表尚未初始化，请刷新后台后重试');
        foreach (self::statements(true) as $statement) $connection->execute($statement);
    }

    public static function ensureMenus(): bool
    {
        $parent = Db::name('system_menus')->where('pid', 0)->where('is_del', 0)->where(function ($query) {
            $query->where('menu_path', '/product')->whereOr('unique_auth', 'in', ['admin-product', 'admin-store-index']);
        })->order('id')->find();
        if (!$parent) return false;
        $menus = Db::name('system_menus')->whereIn('unique_auth', array_keys(self::MENUS))->select()->toArray();
        $ready = count($menus) === count(self::MENUS);
        foreach ($menus as $menu) {
            if ($menu['is_del'] || !$menu['is_show'] || !$menu['is_show_path'] || !$menu['access'] || (int)$menu['auth_type'] !== self::MENUS[$menu['unique_auth']]) $ready = false;
            if ($menu['unique_auth'] === 'admin-product-brand-list' && ((int)$menu['pid'] !== (int)$parent['id'] || $menu['menu_path'] !== '/product/brand/list')) $ready = false;
        }
        if ($ready) return true;

        Db::transaction(function () use ($parent) {
            // Serialize concurrent first visits so INSERT ... NOT EXISTS cannot duplicate menus.
            Db::name('system_menus')->where('id', $parent['id'])->lock(true)->find();
            foreach (self::statements(false) as $statement) Db::execute($statement);
        });
        CacheService::delete('all_auth');
        return true;
    }

    public static function install(): bool
    {
        self::ensureSchema();
        return self::ensureMenus();
    }
}
