<?php
namespace app\services\merchant;

use crmeb\exceptions\AdminException;
use crmeb\services\CacheService;
use think\facade\Db;

class MerchantInstaller
{
    private static $ready = false;
    public const VERSION = 2;
    public const PERMISSIONS = [
        'list' => ['查看商户','get','merchant/shop/list'],
        'info' => ['商户详情','get','merchant/shop/info/<id>'],
        'save' => ['保存商户','post','merchant/shop/save/<id>'],
        'status' => ['商户状态','post','merchant/shop/status/<id>'],
        'history' => ['历史记录','get','merchant/shop/history/<id>'],
        'sensitive' => ['敏感资料读写','get','merchant/shop/sensitive/<id>'],
        'files' => ['私有资料上传下载','post','merchant/document/upload'],
        'export' => ['导出商户资料','get','merchant/shop/export/<id>'],
        'applications' => ['查看入驻申请','get','merchant/application/list'],
        'application-info' => ['申请详情','get','merchant/application/info/<id>'],
        'audit' => ['审核商户资料','post','merchant/application/review/<id>'],
        'submit' => ['提交商户审核','post','merchant/shop/submit/<id>'],
        'withdraw' => ['撤回资料申请','post','merchant/application/withdraw/<id>'],
        'type-list' => ['查看商户类型','get','merchant/type/list'],
        'type-save' => ['维护商户类型','post','merchant/type/save/<id>'],
        'type-delete' => ['删除商户类型','delete','merchant/type/delete/<id>'],
        'tag-list' => ['查看商户标签','get','merchant/tag/list'],
        'tag-save' => ['维护商户标签','post','merchant/tag/save/<id>'],
        'tag-delete' => ['删除商户标签','delete','merchant/tag/delete/<id>'],
    ];

    public static function ensure(bool $force = false): void
    {
        if (self::$ready && !$force) return;
        $db = Db::connect();
        $prefix = (string)$db->getConfig('prefix');
        if (!preg_match('/^[a-zA-Z0-9_]*$/D', $prefix)) throw new AdminException('数据库表前缀不正确');
        $exists = $db->query('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?', [$prefix . 'merchant_install'], true);
        if (!$force && $exists && (int)Db::name('merchant_install')->where('id',1)->value('version') === self::VERSION) { self::$ready = true; return; }
        $pdo = $db->getPdo();
        if ($pdo && $pdo->inTransaction()) throw new AdminException('请先初始化商户管理，再执行保存');
        $lock = 'merchant-install-' . substr(hash('sha256', $db->getConfig('database') . $prefix), 0, 30);
        $acquired = $db->query('SELECT GET_LOCK(?, 15) AS acquired', [$lock]);
        if (empty($acquired[0]['acquired'])) throw new AdminException('商户初始化正在进行，请稍后重试');
        try {
            $sql = file_get_contents(app()->getRootPath() . 'upgrade/merchants.sql');
            if ($sql === false) throw new AdminException('商户初始化 SQL 文件缺失');
            foreach (explode(';', str_replace('`eb_', '`' . $prefix, $sql)) as $statement) if (trim($statement)) $db->execute(trim($statement));
            foreach (['store_product'=>['seller_shop_id'=>"int unsigned NOT NULL DEFAULT 0",'merchant_lock'=>"tinyint unsigned NOT NULL DEFAULT 0"], 'store_order'=>['seller_shop_id'=>"int unsigned NOT NULL DEFAULT 0",'merchant_snapshot'=>"mediumtext NULL"]] as $table=>$columns) {
                if (!$db->query('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?', [$prefix.$table])) continue;
                foreach ($columns as $column=>$type) if (!$db->query('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?', [$prefix.$table,$column])) $db->execute('ALTER TABLE `'.$prefix.$table.'` ADD `'.$column.'` '.$type);
                if (!$db->query('SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND INDEX_NAME=?',[$prefix.$table,'merchant_owner'])) $db->execute('ALTER TABLE `'.$prefix.$table.'` ADD INDEX `merchant_owner` (`seller_shop_id`)');
                $db->getSchemaInfo($prefix.$table, true);
            }
            Db::transaction(function () use ($db, $prefix) {
                if (!Db::name('merchant_type')->count()) foreach (['自营','旗舰店','供应商'] as $i=>$name) Db::name('merchant_type')->insert(['name'=>$name,'sort'=>30-$i*10]);
                $platform = Db::name('merchant_shop')->where('code','PLATFORM')->find();
                if (!$platform) {
                    $profile = MerchantData::normalize(['name'=>'平台商城','type_id'=>(int)Db::name('merchant_type')->where('name','自营')->value('id'),'subject_kind'=>'company','subject_name'=>'平台主体（待完善）']);
                    $id = Db::name('merchant_shop')->insertGetId(['code'=>'PLATFORM','name'=>$profile['name'],'type_id'=>$profile['type_id'],'profile'=>MerchantVault::encrypt($profile),'is_platform'=>1,'state'=>'open','audit_status'=>'approved','created_at'=>time(),'updated_at'=>time()]);
                    $history = Db::name('merchant_history')->insertGetId(['shop_id'=>$id,'event_key'=>'platform-initialized','event_type'=>'create','stage'=>'effective','actor_id'=>0,'actor_kind'=>'system','actor_name'=>'系统','source'=>'migration','summary'=>'建立原平台商品归属基线（非人工资料审核）','payload'=>MerchantVault::encrypt(['after'=>$profile,'changes'=>[]]),'created_at'=>time()]);
                    Db::name('merchant_history_scope')->insert(['history_id'=>$history,'shop_id'=>$id]);
                    $platform = ['id'=>$id];
                }
                // Only known legacy platform rows are mapped. Nonzero legacy merchants remain unmapped.
                foreach (['store_product','store_order'] as $table) if ($db->query('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',[$prefix.$table,'seller_shop_id'])) {
                    $legacy=Db::name($table)->where('mer_id',0)->where('seller_shop_id',0);
                    if ($table==='store_order') $legacy->where(function ($query) { $query->whereNull('merchant_snapshot')->whereOr('merchant_snapshot',''); });
                    $legacy->update(['seller_shop_id'=>$platform['id']]);
                }
                if (Db::name('merchant_install')->where('id',1)->find()) Db::name('merchant_install')->where('id',1)->update(['version'=>self::VERSION]);
                else Db::name('merchant_install')->insert(['id'=>1,'version'=>self::VERSION]);
            });
            self::$ready = true;
        } finally { $db->query('SELECT RELEASE_LOCK(?)',[$lock]); }
    }

    public static function menus(): void
    {
        self::ensure();
        $root = Db::name('system_menus')->where('unique_auth','admin-merchant-management')->find();
        $expected = 5 + count(self::PERMISSIONS);
        if ($root && Db::name('system_menus')->whereLike('unique_auth','merchant-management-%')->where('is_del',0)->count() === $expected - 1) return;
        Db::transaction(function () {
            // Lock an existing stable row to serialize first visits without duplicate menu inserts.
            Db::name('system_menus')->order('id')->lock(true)->find();
            $upsert = function ($auth, $data) {
                $existing = Db::name('system_menus')->where('unique_auth',$auth)->find();
                $data += ['unique_auth'=>$auth,'module'=>'admin','is_show'=>1,'is_show_path'=>1,'is_del'=>0,'access'=>1];
                if ($existing) { Db::name('system_menus')->where('id',$existing['id'])->update($data); return (int)$existing['id']; }
                return (int)Db::name('system_menus')->insertGetId($data);
            };
            $rootId = $upsert('admin-merchant-management',['pid'=>0,'menu_name'=>'商户','menu_path'=>'/merchant','path'=>'','auth_type'=>1,'icon'=>'ios-people-outline']);
            $pages=[];
            foreach (['shop'=>'商户列表','application'=>'入驻申请','type'=>'商户类型','tag'=>'商户标签'] as $key=>$title) $pages[$key]=$upsert('merchant-management-page-'.$key,['pid'=>$rootId,'menu_name'=>$title,'menu_path'=>'/merchant/'.$key.'/list','path'=>(string)$rootId,'auth_type'=>1]);
            foreach (self::PERMISSIONS as $key=>[$title,$method,$route]) {
                $page = strpos($key,'type-')===0?'type':(strpos($key,'tag-')===0?'tag':(in_array($key,['applications','application-info','audit','withdraw'])?'application':'shop'));
                $upsert('merchant-management-'.$key,['pid'=>$pages[$page],'menu_name'=>$title,'api_url'=>$route,'methods'=>strtoupper($method),'path'=>$rootId.'/'.$pages[$page],'auth_type'=>2]);
            }
        });
        CacheService::delete('all_auth');
    }

    public static function platformId(): int
    {
        self::ensure();
        return (int)Db::name('merchant_shop')->where('code','PLATFORM')->value('id');
    }
}
