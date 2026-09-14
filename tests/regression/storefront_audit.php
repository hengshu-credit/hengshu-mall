<?php
require dirname(__DIR__,2).'/crmeb/vendor/autoload.php';
function getLang($value,$replace=[]) {return $value;}
function checkAudit($ok,$label) {if(!$ok)throw new RuntimeException($label);echo 'PASS: '.$label.PHP_EOL;}
$app = new think\App(dirname(__DIR__,2).'/crmeb/');
think\Container::setInstance($app);
function app($name=null) {global $app;return $name===null?$app:$app->make($name);}
$db = new think\DbManager();
$db->setConfig(['default'=>'audit','connections'=>['audit'=>['type'=>'sqlite','database'=>':memory:','prefix'=>'eb_']]]);
$app->instance('db',$db);think\Model::setDb($db);
$db->execute('CREATE TABLE eb_store_product (id INTEGER PRIMARY KEY, seller_shop_id INTEGER, is_show INTEGER, is_del INTEGER)');
$db->execute('INSERT INTO eb_store_product VALUES (1,1,1,0),(2,2,1,0),(3,2,0,0),(4,1,1,1)');
foreach ([0=>[1,2],1=>[1],2=>[2],99=>[]] as $shop=>$expected) {
    $query=(new app\model\product\product\StoreProduct())->withSearch(['seller_shop_id'],['seller_shop_id'=>$shop])->where('is_show',1)->where('is_del',0)->order('id');
    checkAudit(array_map('intval',$query->column('id'))===$expected,'real ORM catalog scope shop='.$shop.' preserves visibility');
}
class AuditThemes extends app\services\diy\ThemeServices {
    public $pages;
    public function __construct($pages) {$this->pages=$pages;}
    public function getThemeInfo($id,$type='all') {return $this->pages[$type]??[];}
}
$live=dirname(__DIR__,2).'/.build/storefront-audit/live/';
$home=json_decode(file_get_contents($live.'home.json'),true)['data'];
$cart=json_decode(file_get_contents($live.'cart_theme.json'),true)['data'];
$themes=new AuditThemes(['home'=>$home,'cart'=>$cart]);
$nav=$themes->themeNavigation('cart',0);
checkAudit(!empty($nav['menuList'])&&$nav['mainNavigation']['pageScoped'],'legacy empty cart navigation inherits configured home navigation');
$themes->pages['cart']=app\services\diy\CartPageConfig::validate(array_replace($cart,['navigation_source'=>'none']));
checkAudit($themes->themeNavigation('cart',0)===[],'explicit navigation removal survives PHP validation');
$themes->pages['cart']=app\services\diy\CartPageConfig::validate(array_replace($cart,['navigation_source'=>'custom','navigation'=>$nav]));
checkAudit(count($themes->themeNavigation('cart',0)['menuList'])===count($nav['menuList']),'separate cart navigation survives PHP validation');
$out=dirname(__DIR__,2).'/.build/storefront-audit';
file_put_contents($out.'/resolved-cart-navigation.json',json_encode($nav,JSON_UNESCAPED_UNICODE));
if (getenv('AUDIT_MEDIA_ORIGIN')) {
    $service=new app\services\product\product\MediaDisplayService(getenv('AUDIT_MEDIA_ORIGIN'));
    $png=$service->image(getenv('AUDIT_MEDIA_PATH'));
    checkAudit(substr($png,0,8)==="\x89PNG\r\n\x1a\n",'PHP image relay returns a decoded PNG through HTTP');
    file_put_contents($out.'/php-rendition.png',$png);
    foreach(['/uploads/../secret.avif','https://remote.test/uploads/image.avif','/uploads/image.png','/uploads/image.avif?url=http://remote.test'] as $path) {
        try {$service->image($path);throw new RuntimeException('unsafe path allowed');}catch(InvalidArgumentException $expected){}
    }
    checkAudit(true,'image relay restricts paths to local AVIF uploads');
}
