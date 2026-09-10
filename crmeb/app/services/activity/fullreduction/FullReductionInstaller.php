<?php
namespace app\services\activity\fullreduction;

use crmeb\exceptions\AdminException;
use crmeb\services\CacheService;
use think\facade\Db;

class FullReductionInstaller
{
    private static function statements(bool $schema): array
    {
        $prefix = (string)Db::connect()->getConfig('prefix');
        if (!preg_match('/^[a-zA-Z0-9_]*$/D', $prefix)) throw new AdminException('数据库表前缀不正确');
        $file = app()->getRootPath() . 'upgrade/full_reduction.sql';
        if (!is_readable($file)) throw new AdminException('满减活动初始化SQL文件缺失');
        $sql = str_replace('`eb_', '`' . $prefix, file_get_contents($file));
        return array_values(array_filter(array_map('trim', explode(';', $sql)), function ($statement) use ($schema) {
            $isSchema = stripos($statement, 'CREATE TABLE') === 0 || stripos($statement, 'INSERT IGNORE') === 0;
            return $statement !== '' && $isSchema === $schema;
        }));
    }

    public static function ensureSchema(): void
    {
        $connection = Db::connect();
        $prefix = (string)$connection->getConfig('prefix');
        $tables = [$prefix . 'store_full_reduction', $prefix . 'store_full_reduction_mutex'];
        $existing = $connection->query('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?, ?)', $tables, true);
        if (count($existing) === 2 && Db::name('store_full_reduction_mutex')->where('id', 1)->count()) {
            self::ensureOrderSchema();
            return;
        }
        // MySQL DDL must never implicitly commit an in-progress business transaction.
        $pdo = $connection->getPdo();
        if ($pdo && $pdo->inTransaction()) throw new AdminException('请先执行 php think full-reduction:install 初始化满减活动');
        foreach (self::statements(true) as $statement) $connection->execute($statement);
        self::ensureOrderSchema();
    }

    private static function ensureOrderSchema(): void
    {
        $connection = Db::connect();
        $table = (string)$connection->getConfig('prefix') . 'store_order';
        if (!preg_match('/^[a-zA-Z0-9_]+$/D', $table)) throw new AdminException('数据库表前缀不正确');
        $columns = $connection->query('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?', [$table], true);
        // Some isolated tools initialize only the marketing tables.
        if (!$columns || in_array('full_reduction_price', array_column($columns, 'COLUMN_NAME'), true)) return;
        $pdo = $connection->getPdo();
        if ($pdo && $pdo->inTransaction()) throw new AdminException('请先执行 php think full-reduction:install 升级订单满减字段');
        try {
            $connection->execute('ALTER TABLE `' . $table . '` ADD COLUMN `full_reduction_price` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT \'满减优惠金额\'');
        } catch (\think\db\exception\PDOException $error) {
            if (strpos($error->getMessage(), '1060') === false) throw $error;
        }
    }

    public static function install(): bool
    {
        self::ensureSchema();
        $parent = Db::name('system_menus')->where('menu_path', '/marketing')->where('pid', 0)->where('is_del', 0)->find();
        if (!$parent) return false;
        $keys = ['list', 'save', 'status', 'delete', 'list-api', 'info-api', 'options-api', 'save-api', 'sort-api', 'status-api', 'delete-api', 'batch-delete-api'];
        $keys = array_map(function ($key) { return 'marketing-full-reduction-' . $key; }, $keys);
        if (Db::name('system_menus')->whereIn('unique_auth', $keys)->count() === count($keys)) return true;
        Db::transaction(function () use ($parent) {
            Db::name('system_menus')->where('id', $parent['id'])->lock(true)->find();
            foreach (self::statements(false) as $statement) Db::execute($statement);
        });
        CacheService::delete('all_auth');
        return true;
    }
}
