<?php
namespace app\services\merchant;
use think\facade\Db;
use crmeb\services\CacheService;

class MerchantThemeInstaller
{
    public static function menus(): void
    {
        $source = Db::name('system_menus')->where('menu_path','/setting/my_theme')->where('is_del',0)->find();
        if (!$source) return;
        $existing = Db::name('system_menus')->where('unique_auth','setting-merchant-theme')->where('is_del',0)->find();
        if ($existing) {
            if ($existing['icon'] !== '') {
                Db::name('system_menus')->where('id',$existing['id'])->update(['icon'=>'']);
                CacheService::delete('all_auth');
            }
            return;
        }
        Db::transaction(function () use ($source) {
            Db::name('system_menus')->where('id',$source['pid'])->lock(true)->find();
            if (Db::name('system_menus')->where('unique_auth','setting-merchant-theme')->where('is_del',0)->find()) return;
            Db::name('system_menus')->insert(['pid'=>$source['pid'],'path'=>$source['path'],'menu_name'=>'商户主题','menu_path'=>'/setting/merchant_theme',
                'module'=>'admin','auth_type'=>1,'is_show'=>1,'is_show_path'=>1,'access'=>1,'unique_auth'=>'setting-merchant-theme','sort'=>$source['sort'] ?? 0,'icon'=>'']);
        });
        CacheService::delete('all_auth');
    }
}
