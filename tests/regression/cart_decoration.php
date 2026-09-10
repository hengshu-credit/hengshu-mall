<?php
require __DIR__ . '/page_navigation.php';
$theme = ['theme_color'=>'#E93323','gradient_color'=>'#FF7931','sub_color'=>'#FAAD14'];
$dao->data['theme_data'] = json_encode($theme);
$cart = ['page_title'=>'我的购物袋','background_color'=>'#EFEFEF','show_service'=>false,'show_recommend'=>false,
    'service_labels'=>['正品保障','精选商品','售后无忧'], 'empty_text'=>'还没有商品', 'checkout_text'=>'去结算',
    'list_style'=>['fillet'=>['type'=>0,'val'=>18]], 'checkout_style'=>['fillet'=>['type'=>0,'val'=>24]],
    'navigation_mode'=>'page','navigation'=>$other['value']['mainNavigation']];
$service->saveTheme(7,['type'=>'cart','value'=>$cart,'tid'=>0,'title'=>'','page_type'=>'theme']);
$saved = $service->getThemeInfo(7,'cart');
navCheck(($saved['page_title']??'')==='我的购物袋','cart configuration survives the real theme service');
navCheck($saved['background_color'] === '#EFEFEF', 'cart page background survives save and reload');
navCheck($saved['list_style']['fillet']['val']===18,'cart product list style survives saving');
navCheck($service->themeNavigation('cart')['menuList'][0]['name']==='详情导航','cart resolves its independent navigation');
navCheck(json_decode($dao->data['theme_data'],true)['theme_color']==='#E93323','saving cart retains theme palette');
$service->saveTheme(7,['type'=>'theme','value'=>$theme,'tid'=>0,'title'=>'','page_type'=>'theme']);
navCheck($service->getThemeInfo(7,'cart')===$saved,'saving palette retains cart decoration');
$cart['navigation']=[];
$service->saveTheme(7,['type'=>'cart','value'=>$cart,'tid'=>0,'title'=>'','page_type'=>'theme']);
navCheck($service->themeNavigation('cart')===[],'deleted cart navigation does not inherit home');
