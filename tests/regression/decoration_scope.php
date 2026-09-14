<?php
namespace app\services\merchant { class MerchantInstaller { public static function ensure(): void {} } }
namespace {
require dirname(__DIR__,2).'/crmeb/vendor/autoload.php';
function getLang($value,$replace=[]) {return $value;}
function checkScope($ok,$message){if(!$ok)throw new \RuntimeException($message);echo 'PASS: '.$message.PHP_EOL;}
$app=new \think\App(dirname(__DIR__,2).'/crmeb/');\think\Container::setInstance($app);
function app($name=null){global $app;return $name===null?$app:$app->make($name);}
$db=new \think\DbManager();$db->setConfig(['default'=>'test','connections'=>['test'=>['type'=>'sqlite','database'=>':memory:','prefix'=>'eb_']]]);
$app->instance('db',$db);\think\Model::setDb($db);$app->instance('http',new class {function getName(){return 'adminapi';}});
putenv('CRMEB_MERCHANT_KEY='.str_repeat('1',64));
$db->execute('CREATE TABLE eb_merchant_shop (id INTEGER PRIMARY KEY,name TEXT,state TEXT,audit_status TEXT,subject_id INTEGER,profile TEXT,type_id INTEGER DEFAULT 0)');
$db->execute('CREATE TABLE eb_merchant_shop_tag (shop_id INTEGER,tag_id INTEGER)');
$db->execute('CREATE TABLE eb_merchant_subject (id INTEGER PRIMARY KEY,profile TEXT)');
$db->execute('CREATE TABLE eb_store_product (id INTEGER PRIMARY KEY,seller_shop_id INTEGER,mer_id INTEGER,is_show INTEGER,is_del INTEGER)');
$db->execute('CREATE TABLE eb_store_product_cate (product_id INTEGER,cate_id INTEGER,cate_pid INTEGER)');
foreach([[1,'open',''],[2,'suspended',''],[3,'open','2000-01-01']] as $row)$db->name('merchant_shop')->insert(['id'=>$row[0],'name'=>'Shop '.$row[0],'state'=>$row[1],'audit_status'=>'approved','subject_id'=>0,'profile'=>\app\services\merchant\MerchantVault::encrypt(['valid_until'=>$row[2]])]);
$db->execute('INSERT INTO eb_store_product VALUES (11,1,0,1,0),(12,1,0,0,0),(13,1,0,1,1),(21,2,0,1,0),(31,3,0,1,0),(41,0,0,1,0),(51,0,9,1,0)');
$dao=new \app\dao\product\product\StoreProductDao();
foreach([0=>[11,41],1=>[11],2=>[],3=>[],99=>[]] as $shopId=>$expected){
    $actual=array_map('intval',$dao->search(['storefront_preview'=>true,'seller_shop_id'=>$shopId,'is_show'=>1,'is_del'=>0],false)->order('id')->column('id'));
    checkScope($actual===$expected,'real admin preview DAO uses public eligibility and shop scope '.$shopId);
    $custom=array_map('intval',array_column($dao->getThemeProduct(['ids'=>'','cate_ids'=>'','seller_shop_id'=>$shopId,'storefront_preview'=>true],'id asc',20),'id'));
    checkScope($custom===$expected,'super component preview uses public eligibility and shop scope '.$shopId);
}
$normal=array_map('intval',$dao->search(['is_show'=>1,'is_del'=>0],false)->order('id')->column('id'));
checkScope($normal===[11,21,31,41,51],'normal admin inventory still includes suspended and expired merchants');
$rows=\app\services\merchant\MerchantStorefrontServices::decorateProducts([['id'=>11],['id'=>41]]);
checkScope($rows[0]['seller_shop_id']===1&&$rows[0]['merchant_name']==='Shop 1'&&$rows[1]['merchant_name']==='','preview merchant labels reflect actual ownership');
class ScopeThemes extends \app\services\diy\ThemeServices {
    public $pages=[];
    public function __construct(){}
    public function getThemeInfo($id,$type='all'){return $this->pages[$type]??[];}
}
$themes=new ScopeThemes();$app->instance(\app\services\diy\ThemeServices::class,$themes);
$themes->pages=['theme'=>['theme_color'=>'#155eef'],'category'=>['status'=>3], 'home'=>['value'=>[['name'=>'mainNavigation','menuList'=>[['name'=>'继承导航','link'=>'/pages/index/index']]]]]];
$resolved=\app\services\merchant\MerchantThemeServices::resolve(1,'category');
checkScope($resolved['page']['navigation']['menuList'][0]['name']==='继承导航','legacy merchant category receives resolved inherited navigation');
$themes->pages['category']=['status'=>3,'navigation_mode'=>'page','navigation'=>[]];
checkScope(\app\services\merchant\MerchantThemeServices::resolve(1,'category')['page']['navigation']===[],'explicit category navigation deletion stays closed after merchant resolution');
}
