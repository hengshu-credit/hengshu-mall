<?php
require dirname(__DIR__,2).'/crmeb/vendor/autoload.php';
use app\services\activity\style\MarketingStyleConfig as Config;
use app\services\activity\style\MarketingStyleInstaller as Installer;
use app\services\activity\style\MarketingStyleServices;
use crmeb\exceptions\AdminException;
use think\facade\Db;
function getLang($value,$replace=[]) { return $value; }
function sys_config($key,$default=null) { return $default; }
function checkStyle($name,$ok) { if (!$ok) throw new RuntimeException('FAIL: '.$name); echo 'PASS: '.$name.PHP_EOL; }
function rejectStyle($name,callable $fn) { try { $fn(); } catch(AdminException $e) { checkStyle($name,true);return; } checkStyle($name,false); }
$base=['name'=>'范围与定时验证','kind'=>'border','mobile_image'=>'/uploads/test-frame.png','pc_image'=>'','start_time'=>time()-60,'end_time'=>time()+3600,'enabled'=>1,'priority'=>0,'scope_type'=>'all','scope_ids'=>[]];
checkStyle('normalize enabled and scope identifiers',Config::validate($base+[])['enabled']===1);
foreach ([['name'=>' '],['kind'=>'other'],['end_time'=>$base['start_time']],['mobile_image'=>'javascript:alert(1)'],['scope_type'=>'products','scope_ids'=>[]],['scope_type'=>'labels','scope_ids'=>[true]],['priority'=>-1],['enabled'=>2]] as $bad) rejectStyle('invalid style rejected',function()use($base,$bad){Config::validate(array_replace($base,$bad));});
checkStyle('end boundary stops display',Config::status(['enabled'=>1,'start_time'=>100,'end_time'=>200],200)==='ended');
checkStyle('disabled overrides schedule',Config::status(['enabled'=>0,'start_time'=>100,'end_time'=>200],150)==='disabled');
if (getenv('CRMEB_AUDIT_DATABASE')!=='crmeb_marketing_style_audit') throw new RuntimeException('Use run-marketing-styles.ps1');
$testApp=new think\App(dirname(__DIR__,2).'/crmeb/');think\Container::setInstance($testApp);
function app($name=null){global $testApp;return $name===null?$testApp:$testApp->make($name);}
function config($name,$default=null){return app()->config->get($name,$default);}
$db=new think\DbManager();$db->setConfig(['default'=>'mysql','connections'=>['mysql'=>['type'=>'mysql','hostname'=>'127.0.0.1','hostport'=>3306,'database'=>'crmeb_marketing_style_audit','username'=>'root','password'=>'marketing_style-audit-only','charset'=>'utf8mb4','prefix'=>'test_','fields_strict'=>true]]]);
$testApp->instance('db',$db);$testApp->config->set(['default'=>'file','stores'=>['file'=>['type'=>'File','path'=>sys_get_temp_dir().'/marketing-style-audit/']]],'cache');think\Model::setDb($db);(new think\service\ModelService($testApp))->boot();
$schema=file_get_contents(dirname(__DIR__,2).'/crmeb/public/install/crmeb.sql');
foreach(['system_menus','system_role','store_product','store_category','store_product_label'] as $table){preg_match('/CREATE TABLE IF NOT EXISTS `eb_'.$table.'`.*?;/s',$schema,$match);Db::execute(str_replace('`eb_','`test_',$match[0]));}
Db::name('system_menus')->insert(['id'=>1,'menu_path'=>'/marketing','menu_name'=>'营销','is_show_path'=>1,'auth_type'=>1]);
Installer::install();Installer::install();checkStyle('custom-prefix installation is idempotent',Db::name('system_menus')->whereLike('unique_auth','marketing-style-%')->count()===10);
Db::name('store_category')->insertAll([['id'=>1,'pid'=>0,'cate_name'=>'父分类'],['id'=>2,'pid'=>1,'cate_name'=>'子分类'],['id'=>3,'pid'=>0,'cate_name'=>'其他分类']]);
Db::name('store_product')->insertAll([['id'=>1,'store_name'=>'商品A','image'=>'/original-a.png','cate_id'=>'2','label_list'=>'1','is_show'=>1],['id'=>2,'store_name'=>'商品B','image'=>'/original-b.png','cate_id'=>'3','label_list'=>'','is_show'=>1]]);
Db::name('store_product_label')->insert(['id'=>1,'name'=>'商品标签']);
app\services\product\product\ProductBrandInstaller::ensureSchema();Db::name('store_product_brand')->insert(['id'=>1,'name'=>'品牌A']);Db::name('store_product_brand_relation')->insert(['product_id'=>1,'brand_id'=>1]);
$service=app()->make(MarketingStyleServices::class);
$all=$service->saveStyle(0,$base);$cat=$service->saveStyle(0,array_replace($base,['name'=>'分类边框','scope_type'=>'categories','scope_ids'=>[1],'priority'=>5]));
$atmos=$service->saveStyle(0,array_replace($base,['kind'=>'atmosphere','name'=>'品牌氛围','scope_type'=>'brands','scope_ids'=>[1],'mobile_image'=>'/uploads/banner.png','pc_image'=>'/uploads/banner-pc.png']));
$products=[['id'=>1,'image'=>'/original-a.png'],['id'=>2,'image'=>'/original-b.png']];
$decorated=$service->decorateProducts($products);
checkStyle('parent category includes descendants and priority wins',$decorated[0]['marketing_style']['border']['id']===$cat);
checkStyle('all-product rule remains available outside selected category',$decorated[1]['marketing_style']['border']['id']===$all);
checkStyle('border and atmosphere coexist independently',$decorated[0]['marketing_style']['atmosphere']['id']===$atmos && $decorated[1]['marketing_style']['atmosphere']===null);
checkStyle('original images are never rewritten',array_column($decorated,'image')===array_column($products,'image'));
$activity=$service->decorateProducts([['id'=>99,'product_id'=>1]],'product_id');
checkStyle('activity products resolve by their underlying product ID',$activity[0]['marketing_style']['border']['id']===$cat && $activity[0]['id']===99);
$label=$service->saveStyle(0,array_replace($base,['scope_type'=>'labels','scope_ids'=>[1],'priority'=>10]));
checkStyle('product-label targeting resolves to matching products',$service->decorateProducts($products)[0]['marketing_style']['border']['id']===$label);
$explicit=$service->saveStyle(0,array_replace($base,['scope_type'=>'products','scope_ids'=>[1],'priority'=>10]));
checkStyle('equal priority uses most recently created rule',$service->decorateProducts($products)[0]['marketing_style']['border']['id']===$explicit);
$service->setEnabled($explicit,0);checkStyle('disabling a style immediately restores next eligible rule',$service->decorateProducts($products)[0]['marketing_style']['border']['id']===$label);
$service->deleteStyle($label);checkStyle('soft deletion removes style from resolver',$service->decorateProducts($products)[0]['marketing_style']['border']['id']===$cat);
rejectStyle('deleted rule cannot be edited',function()use($service,$label){$service->info($label);});
rejectStyle('unknown product cannot be selected',function()use($service,$base){$service->saveStyle(0,array_replace($base,['scope_type'=>'products','scope_ids'=>[999]]));});
$future=$service->saveStyle(0,array_replace($base,['start_time'=>time()+7200,'end_time'=>time()+9000,'priority'=>999]));
checkStyle('scheduled styles do not start early',$service->decorateProducts($products)[0]['marketing_style']['border']['id']===$cat);
Db::name('marketing_style')->where('id',$cat)->update(['end_time'=>time()-1]);
checkStyle('expired styles restore normal fallback',$service->decorateProducts($products)[0]['marketing_style']['border']['id']===$all);
checkStyle('selected scope is hydrated for editing',$service->info($atmos)['scope_items'][0]['name']==='品牌A');
$listing=$service->styleList(['kind'=>'atmosphere']);checkStyle('list filtering and matched product count',$listing['count']===1 && $listing['list'][0]['product_count']===1);
checkStyle('timestamps remain integer seconds under production ORM settings',$service->info($all)['update_time']>1700000000);
checkStyle('option selector searches by ID',$service->options(['type'=>'product','keyword'=>'2'])['list'][0]['id']===2);
$readId=Db::name('system_menus')->where('unique_auth','marketing-style-list-api')->value('id');
Db::name('system_role')->insert(['id'=>1,'role_name'=>'营销样式只读','rules'=>(string)$readId,'status'=>1]);
class MarketingPermissionProbe extends app\adminapi\controller\v1\marketing\MarketingStyle {
    public function __construct() { $this->adminInfo=['level'=>1,'roles'=>[1]]; }
    public function probe($method,$route) { $this->permission($method,$route); }
}
$probe=new MarketingPermissionProbe();$probe->probe('get','list');
try { $probe->probe('post','save/<id>'); throw new RuntimeException('Readonly role could write styles'); }
catch (crmeb\exceptions\AuthException $expected) { checkStyle('read-only marketing role cannot create or modify styles',true); }
echo "Marketing styles database and scope checks complete.\n";
