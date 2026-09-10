<?php
namespace app\services\activity\style;
use crmeb\exceptions\AdminException;
use crmeb\services\CacheService;
use think\facade\Db;

class MarketingStyleInstaller
{
    public static function available(): bool
    {
        $prefix=(string)Db::connect()->getConfig('prefix');
        return (bool)Db::query('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?',[$prefix.'marketing_style']);
    }
    private static function statements(bool $schema): array
    {
        $prefix=(string)Db::connect()->getConfig('prefix');
        if (!preg_match('/^[a-zA-Z0-9_]*$/D',$prefix)) throw new AdminException('数据库表前缀不正确');
        $file=app()->getRootPath().'upgrade/marketing_styles.sql';
        if (!is_readable($file)) throw new AdminException('营销样式初始化SQL文件缺失');
        $sql=str_replace('`eb_','`'.$prefix,file_get_contents($file));
        return array_values(array_filter(array_map('trim',explode(';',$sql)),function($statement)use($schema){return $statement!=='' && (stripos($statement,'CREATE TABLE')===0)===$schema;}));
    }
    public static function ensureSchema(): void
    {
        if (self::available()) return;
        $pdo=Db::connect()->getPdo();
        if ($pdo && $pdo->inTransaction()) throw new AdminException('请先执行 php think marketing-style:install 初始化营销样式');
        foreach(self::statements(true) as $statement) Db::execute($statement);
    }
    public static function install(): bool
    {
        self::ensureSchema();
        $parent=Db::name('system_menus')->where('pid',0)->where('menu_path','/marketing')->where('is_del',0)->find();
        if (!$parent) return false;
        $keys=['list','save','status','delete','list-api','info-api','options-api','save-api','status-api','delete-api'];
        $keys=array_map(function($key){return 'marketing-style-'.$key;},$keys);
        if (Db::name('system_menus')->whereIn('unique_auth',$keys)->count()===count($keys)) return true;
        Db::transaction(function()use($parent){Db::name('system_menus')->where('id',$parent['id'])->lock(true)->find();foreach(self::statements(false) as $statement) Db::execute($statement);});
        CacheService::delete('all_auth');
        return true;
    }
}
