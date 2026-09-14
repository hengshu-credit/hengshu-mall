<?php
namespace app\services\system;
use think\facade\Db;

class CommerceReliabilityInstaller
{
    const VERSION = 1;
    public static function install(): void
    {
        $db=Db::connect();$prefix=(string)$db->getConfig('prefix');
        if (!preg_match('/^[a-zA-Z0-9_]*$/D',$prefix) || $db->getPdo()->inTransaction()) throw new \RuntimeException('Install reliability schema outside a business transaction');
        foreach(explode(';',str_replace('`eb_','`'.$prefix,file_get_contents(app()->getRootPath().'upgrade/commerce_reliability.sql')))as $sql)if(trim($sql))$db->execute($sql);
        \app\services\product\product\ProductQualityInstaller::install();
        Db::transaction(function(){
            $parent=Db::name('system_menus')->where('pid',0)->where('menu_path','/finance')->lock(true)->find();
            if (!$parent) return;
            $key='finance-commerce-health';
            $id=Db::name('system_menus')->where('unique_auth',$key)->value('id');
            if(!$id)$id=Db::name('system_menus')->insertGetId(['pid'=>$parent['id'],'path'=>(string)$parent['id'],'menu_name'=>'交易异常监控','menu_path'=>'/finance/commerce','unique_auth'=>$key,'auth_type'=>1,'is_show'=>1,'is_show_path'=>1,'access'=>1]);
            foreach(['health','tasks','refunds']as $action){
                if(!Db::name('system_menus')->where('unique_auth',$key.'-'.$action)->find())Db::name('system_menus')->insert(['pid'=>$id,'path'=>$parent['id'].'/'.$id,'menu_name'=>'查询交易'.$action,'unique_auth'=>$key.'-'.$action,'auth_type'=>2,'api_url'=>'finance/commerce/'.$action,'methods'=>'GET','is_show'=>1,'access'=>1]);
            }
        });
        \crmeb\services\CacheService::delete('all_auth');
    }
}
