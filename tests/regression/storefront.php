<?php
// Inherit the isolated merchant workflow fixture; never run against the development DB.
require __DIR__ . '/merchants.php';
function set_file_url($value) { return $value; }
use think\facade\Db;
use app\services\merchant\MerchantStorefrontServices;
use app\services\merchant\MerchantShopPages;
use app\services\merchant\MerchantVault;
use app\services\diy\ThemeServices;
use app\services\diy\MerchantDecorationConfig;

foreach (['theme','store_product_reply','store_category','store_product_cate'] as $table) {
    preg_match('/CREATE TABLE IF NOT EXISTS `eb_'.$table.'`.*?;/s',$sql,$match);
    checkMerchant('fixture schema ' . $table, !empty($match[0]));
    Db::execute(str_replace('`eb_', '`test_', $match[0]));
}
$themes = app()->make(ThemeServices::class);
$storefront = new MerchantStorefrontServices();
$shopConfig = ['type'=>'shop','title'=>'品牌店铺','shop_category_style'=>3,'is_show'=>1,'navigation_mode'=>'page','actions_mode'=>'components','value'=>[]];
$pageId = $themes->saveTheme(0,['tid'=>0,'title'=>'店铺模板 A','page_type'=>'shop','type'=>'shop','value'=>$shopConfig]);
checkMerchant('shop page is a standalone special page',Db::name('theme')->where('id',$pageId)->value('page_type')==='shop');
checkMerchant('category layout survives page save',$themes->getThemeInfo($pageId,'shop')['shop_category_style']===3);
rejectMerchant('shop template cannot replace the active mall theme',function()use($themes,$pageId){$themes->useTheme($pageId);});
$bad = $shopConfig; $bad['shop_category_style']=4;
rejectMerchant('unsupported category layout rejected',function()use($themes,$pageId,$bad){$themes->saveTheme($pageId,['tid'=>0,'title'=>'','type'=>'shop','value'=>$bad]);});

$ownerProfile = $profile;
$ownerProfile['name']='店铺 A'; $ownerProfile['valid_until']='长期'; $ownerProfile['shop_page_id']=$pageId;
$shopA=Db::name('merchant_shop')->insertGetId(['code'=>'STORE_A','name'=>'店铺 A','state'=>'open','audit_status'=>'approved','profile'=>MerchantVault::encrypt($ownerProfile)]);
$ownerProfile['name']='店铺 B';$ownerProfile['shop_page_id']=0;
$shopB=Db::name('merchant_shop')->insertGetId(['code'=>'STORE_B','name'=>'店铺 B','state'=>'open','audit_status'=>'approved','profile'=>MerchantVault::encrypt($ownerProfile)]);
$bindingProfile=$ownerProfile; $bindingProfile['name']='绑定回归商户'; $bindingProfile['document_ids']=[]; $bindingProfile['shop_page_id']=0;
$bindingProfile['type_id']=(int)Db::name('merchant_type')->where('status',1)->value('id'); $bindingProfile['tag_ids']=[];
$bindingMerchant=$s->saveShop(0,$bindingProfile,0,$actor,merchantKey('storefront-create'));
$bindingSaved=$s->saveShop($bindingMerchant['id'],['shop_page_id'=>(int)$pageId],1,$actor,merchantKey('storefront-bind'));
checkMerchant('merchant save persists a single bound page',$s->info($bindingMerchant['id'],true)['profile']['shop_page_id']===(int)$pageId);
checkMerchant('binding changes are recorded in existing history',$s->histories($bindingMerchant['id'],['event_type'=>'change'],true)['count']===1);
rejectMerchant('merchant save rejects invalid binding',function()use($s,$bindingMerchant,$bindingSaved,$actor){$s->saveShop($bindingMerchant['id'],['shop_page_id'=>999999],$bindingSaved['version'],$actor,merchantKey('storefront-invalid'));});
Db::name('store_product')->where('id','>',0)->update(['is_show'=>0]);
foreach ([[301,$shopA,8],[302,$shopA,12],[303,$shopB,30],[304,$shopA,0]] as [$pid,$owner,$sales]) Db::name('store_product')->insert(['id'=>$pid,'store_name'=>'商品 '.$pid,'seller_shop_id'=>$owner,'is_show'=>1,'is_del'=>0,'sales'=>$sales,'price'=>99,'stock'=>10,'is_new'=>1,'is_best'=>1,'is_hot'=>1,'is_benefit'=>1]);
Db::name('store_category')->insertAll([['id'=>10,'pid'=>0,'cate_name'=>'服饰','is_show'=>1],['id'=>11,'pid'=>10,'cate_name'=>'上装','is_show'=>1],['id'=>12,'pid'=>0,'cate_name'=>'数码','is_show'=>1]]);
foreach ([[301,11,10],[302,11,10],[303,12,0],[304,11,10]] as [$pid,$cate,$parent]) Db::name('store_product_cate')->insert(['product_id'=>$pid,'cate_id'=>$cate,'cate_pid'=>$parent]);
foreach ([[301,5,1],[302,4,1],[302,1,0],[303,5,1]] as $i=>[$pid,$score,$status]) Db::name('store_product_reply')->insert(['product_id'=>$pid,'product_score'=>$score,'service_score'=>4,'status'=>$status,'oid'=>800+$i,'unique'=>'reply'.$i]);

$shop=$storefront->shop($shopA);
checkMerchant('entry resolves the merchant bound page',(int)$shop['shop_page']['id']===(int)$pageId && $shop['shop_page']['config']['shop_category_style']===3);
checkMerchant('public shop contains no private profile',!isset($shop['profile'])&&!isset($shop['contact_phone'])&&!isset($shop['bank_account']));
checkMerchant('scores include only visible reviews',$shop['review_count']===2 && $shop['product_score']===4.5);
checkMerchant('unbound merchant uses explicit fallback',$storefront->shop($shopB)['shop_page']===null);
checkMerchant('shop products do not leak across merchants',array_column($storefront->products(['shop_id'=>$shopA,'sort'=>'sales'])['list'],'id')===[302,301,304]);
checkMerchant('shop pagination correct',count($storefront->products(['shop_id'=>$shopA],2,2)['list'])===1);
checkMerchant('shop categories only include its products',array_column($storefront->categories($shopA),'id')===[10] && $storefront->categories($shopA)[0]['children'][0]['id']===11);
checkMerchant('sales ranking excludes zero sales',array_column($storefront->ranking(['shop_id'=>$shopA]),'id')===[302,301]);
$ranking=$storefront->ranking(['shop_id'=>$shopA,'type'=>'rating']);
checkMerchant('rating ranking ignores unshown reviews',array_column($ranking,'id')===[301,302]);
checkMerchant('unreviewed product is not rated',!in_array(304,array_column($ranking,'id')));
$badge=$storefront->productRank(301,['scope'=>'category','type'=>'sales']);
checkMerchant('detail badge matches category ranking',$badge['rank']===2 && $badge['category_id']===11);
checkMerchant('outside top N has no badge',$storefront->productRank(301,['scope'=>'category','type'=>'sales'],1)===null);
checkMerchant('public products include shop label',$storefront->products(['shop_id'=>$shopA])['list'][0]['merchant_name']==='店铺 A');
rejectMerchant('bound shop page cannot be deleted',function()use($themes,$pageId){$themes->deleteTheme($pageId);});
rejectMerchant('ordinary theme cannot bind as a shop page',function(){MerchantShopPages::validate(999999);});
Db::name('merchant_shop')->where('id',$shopA)->update(['state'=>'paused']);
checkMerchant('paused shops are removed from directory',!in_array($shopA,array_column($storefront->shops()['list'],'id')));
checkMerchant('paused shops are removed from public rankings',!array_intersect([301,302,304],array_column($storefront->ranking(),'id')));
try{$storefront->shop($shopA);throw new RuntimeException('FAIL paused storefront should fail');}catch(crmeb\exceptions\ApiException $e){checkMerchant('paused storefront cannot be opened',true);}
$invalid=['value'=>[['name'=>'recommendGroup','groups'=>[['title'=>'测试','subtitle'=>'','type'=>'new','link'=>'javascript:alert(1)']]]]];
rejectMerchant('unsafe recommendation link rejected',function()use($invalid){MerchantDecorationConfig::validatePage($invalid);});
echo "Storefront regression complete\n";
