<?php
require __DIR__.'/storefront.php';
use think\facade\Db;
use app\services\merchant\MerchantThemeServices;
use app\services\merchant\MerchantFollowServices;
use app\services\merchant\MerchantThemeInstaller;
use app\services\merchant\MerchantVault;

Db::name('merchant_shop')->where('id',$shopA)->update(['state'=>'open']);
$mall=$themes->saveTheme(0,['tid'=>0,'title'=>'商城主题','page_type'=>'theme','type'=>'home','value'=>['value'=>[]]]);
$themes->useTheme($mall);
$mallCategory=['status'=>2,'page_title'=>'商城分类','columns'=>4,'image_radius'=>18,'product_layout'=>'large','price_color'=>'#112233'];
$themes->saveTheme($mall,['tid'=>0,'title'=>'','page_type'=>'theme','type'=>'category','value'=>$mallCategory]);
$mallPalette=['theme_color'=>'#123456','gradient_color'=>'#234567','sub_color'=>'#345678'];
$themes->saveTheme($mall,['tid'=>0,'title'=>'','page_type'=>'theme','type'=>'theme','value'=>$mallPalette]);
$mallDetail=['value'=>[1000=>['name'=>'productInfo','timestamp'=>1000,'cname'=>'商品信息']]];
$themes->saveTheme($mall,['tid'=>0,'title'=>'','page_type'=>'theme','type'=>'detail','value'=>$mallDetail]);
$merchant=$themes->saveTheme(0,['tid'=>0,'title'=>'商户主题A','page_type'=>'merchant','type'=>'home','value'=>['value'=>[]]]);
checkMerchant('new merchant theme inherits a usable category and detail baseline',$themes->getThemeInfo($merchant,'category')['columns']===4 && $themes->getThemeInfo($merchant,'detail')===$mallDetail);
checkMerchant('merchant theme remains outside active mall themes',Db::name('theme')->where('id',$merchant)->value('page_type')==='merchant' && Db::name('theme')->where('id',$merchant)->value('is_use')==0);
$merchantCategory=['status'=>3,'page_title'=>'本店分类','columns'=>2,'image_radius'=>26,'product_layout'=>'list','price_color'=>'#993311'];
$themes->saveTheme($merchant,['tid'=>0,'title'=>'','page_type'=>'merchant','type'=>'category','value'=>$merchantCategory]);
$merchantPalette=['theme_color'=>'#AA1122','gradient_color'=>'#BB2233','sub_color'=>'#CC3344'];
$themes->saveTheme($merchant,['tid'=>0,'title'=>'','page_type'=>'merchant','type'=>'theme','value'=>$merchantPalette]);
$merchantDetail=['value'=>[1000=>['name'=>'productInfo','timestamp'=>1000,'cname'=>'商户商品'],2000=>['name'=>'shopFollow','timestamp'=>2000,'cname'=>'关注店铺']]];
$themes->saveTheme($merchant,['tid'=>0,'title'=>'','page_type'=>'merchant','type'=>'detail','value'=>$merchantDetail]);
$profileA=MerchantVault::decrypt(Db::name('merchant_shop')->where('id',$shopA)->value('profile'));$profileA['shop_page_id']=(int)$merchant;
Db::name('merchant_shop')->where('id',$shopA)->update(['profile'=>MerchantVault::encrypt($profileA)]);
$resolved=MerchantThemeServices::resolve($shopA,'category');
checkMerchant('merchant categories retain full independent decoration',$resolved['page']['status']===3 && $resolved['page']['page_title']==='本店分类' && $resolved['page']['image_radius']===26);
checkMerchant('merchant theme applies its own palette',$resolved['palette']['theme_color']==='#AA1122');
checkMerchant('merchant style does not overwrite the mall',$themes->getThemeInfo($mall,'theme')['theme_color']==='#123456' && $themes->getThemeInfo($mall,'category')['columns']===4);
checkMerchant('merchant product detail resolves its configured page',MerchantThemeServices::resolve($shopA,'detail')['page']===$merchantDetail);
checkMerchant('unbound merchant inherits mall detail',MerchantThemeServices::resolve($shopB,'detail')['page']===$mallDetail);
rejectMerchant('bound merchant themes cannot be deleted',function()use($themes,$merchant){$themes->deleteTheme($merchant);});
$themes->saveTheme($pageId,['tid'=>0,'title'=>'','page_type'=>'merchant','type'=>'category','value'=>$merchantCategory]);
checkMerchant('legacy shop page upgrades without losing home or bindings',Db::name('theme')->where('id',$pageId)->value('page_type')==='merchant' && json_decode(Db::name('theme')->where('id',$pageId)->value('home_data'),true)===$shopConfig);

$follow=new MerchantFollowServices();
$follow->set(9901,$shopA,true);$follow->set(9901,$shopA,true);
checkMerchant('repeated follow requests are idempotent',$follow->state(9901,$shopA)['follower_count']===1);
checkMerchant('follow state is isolated per user',$follow->state(9901,$shopA)['followed'] && !$follow->state(9902,$shopA)['followed']);
$follow->set(9902,$shopB,true);
checkMerchant('personal followed list cannot see another user subscriptions',array_column($follow->listing(9901)['list'],'id')===[(int)$shopA]);
Db::name('merchant_shop')->where('id',$shopA)->update(['state'=>'paused']);
checkMerchant('closed shop remains manageable in followed list',!$follow->listing(9901)['list'][0]['available']);
$follow->set(9901,$shopA,false);$follow->set(9901,$shopA,false);
checkMerchant('unfollow works for paused shops and repeated requests',$follow->listing(9901)['count']===0 && $follow->state(9901,$shopA)['follower_count']===0);
try{$follow->set(0,$shopB,true);throw new RuntimeException('anonymous follow accepted');}catch(crmeb\exceptions\ApiException $e){checkMerchant('anonymous users cannot follow',true);}
try{$follow->set(9901,$shopA,true);throw new RuntimeException('paused shop follow accepted');}catch(crmeb\exceptions\ApiException $e){checkMerchant('cannot newly follow a paused shop',true);}
$decorationMenu=Db::name('system_menus')->insertGetId(['menu_name'=>'装修','menu_path'=>'/setting/store','pid'=>0]);
Db::name('system_menus')->insert(['menu_name'=>'我的主题','menu_path'=>'/setting/my_theme','pid'=>$decorationMenu,'path'=>(string)$decorationMenu]);
MerchantThemeInstaller::menus();MerchantThemeInstaller::menus();
checkMerchant('merchant theme menu is installed once under decoration',Db::name('system_menus')->where('unique_auth','setting-merchant-theme')->where('pid',$decorationMenu)->count()===1);
echo "Merchant theme and follow regression complete\n";
