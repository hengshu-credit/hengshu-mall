<?php
namespace app\services\activity\ranking;
use crmeb\exceptions\AdminException;
use crmeb\services\CacheService;
use think\facade\Db;

class RankingInstaller
{
    public static function available(): bool
    {
        return (bool)Db::query('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?',[(string)Db::connect()->getConfig('prefix').'marketing_ranking']);
    }
    public static function ensureSchema(): void
    {
        if (self::available()) return;
        if (Db::connect()->getPdo()->inTransaction()) throw new AdminException('请先执行 php think ranking:install 初始化排行榜');
        $prefix=(string)Db::connect()->getConfig('prefix');
        if (!preg_match('/^[a-zA-Z0-9_]*$/D',$prefix)) throw new AdminException('数据库表前缀不正确');
        $sql=file_get_contents(app()->getRootPath().'upgrade/rankings.sql');
        foreach (explode(';',str_replace('`eb_','`'.$prefix,$sql)) as $statement) if (trim($statement)) Db::execute(trim($statement));
    }
    public static function install(): bool
    {
        self::ensureSchema();
        $parent=Db::name('system_menus')->where('pid',0)->where('menu_path','/marketing')->where('is_del',0)->find();
        if (!$parent) return false;
        if (Db::name('system_menus')->whereLike('unique_auth','marketing-ranking-%')->count()===11) return true;
        Db::transaction(function()use($parent){
            Db::name('system_menus')->where('id',$parent['id'])->lock(true)->find();
            $add=function($key,$name,$pid,$path,$extra=[]) {
                $auth='marketing-ranking-'.$key;
                $id=Db::name('system_menus')->where('unique_auth',$auth)->value('id');
                return $id ?: Db::name('system_menus')->insertGetId($extra+['pid'=>$pid,'path'=>$path,'menu_name'=>$name,'module'=>'admin','auth_type'=>3,'is_show'=>1,'is_show_path'=>0,'access'=>1,'unique_auth'=>$auth]);
            };
            $list=$add('list','排行榜',$parent['id'],(string)$parent['id'],['auth_type'=>1,'is_show_path'=>1,'menu_path'=>'/marketing/ranking/list']);
            $path=$parent['id'].'/'.$list;
            $save=$add('save','创建或编辑榜单',$list,$path); $status=$add('status','启停榜单',$list,$path); $delete=$add('delete','删除榜单',$list,$path);
            foreach ([['list','GET','list',$list],['info','GET','info/<id>',$list],['options','GET','options',$list],['preview','POST','preview',$list],['save','POST','save/<id>',$save],['status','PUT','status/<id>',$status],['delete','DELETE','del/<id>',$delete]] as $item) {
                $add($item[0].'-api','榜单'.$item[0],$item[3],$item[3]===$list?$path:$path.'/'.$item[3],['auth_type'=>2,'api_url'=>'marketing/ranking/'.$item[2],'methods'=>$item[1]]);
            }
        });
        CacheService::delete('all_auth');
        return true;
    }
}
