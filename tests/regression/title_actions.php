<?php
require __DIR__ . '/main_navigation.php';
$actions = ['left'=>[['type'=>'back','label'=>'返回']], 'right'=>[['type'=>'search','label'=>'搜索']]];
$category = app\services\diy\CategoryPageConfig::validate(['status'=>2,'title_actions'=>$actions]);
navCheck(isset($category['title_actions']['right'][0]) && $category['title_actions']['right'][0]['type']==='search', 'category title search action survives server validation');
$actions['right'][] = ['type'=>'cartManage','label'=>'管理','showLabel'=>true];
$cart = app\services\diy\CartPageConfig::validate(['title_actions'=>$actions]);
navCheck($cart['title_actions']['right'][1]['type']==='cartManage', 'cart title management action survives server validation');
navCheck(app\services\diy\CartPageConfig::validate(['title_actions'=>['left'=>[],'right'=>[]]])['title_actions']['right']===[], 'explicitly removed title buttons remain removed');
$url = 'https://example.com/help?source=title&next=%2Fdocs#start';
$urlActions = ['right'=>[['type'=>'url','label'=>'帮助','link'=>$url]]];
navCheck(app\services\diy\CartPageConfig::validate(['title_actions'=>$urlActions])['title_actions']['right'][0]['link']===$url, 'title URL action preserves the complete destination');
foreach (['javascript:alert(1)', '//example.com', 'https://', 'https://example.com/a b'] as $invalid) {
    try { app\services\diy\PageActionsConfig::header(['right'=>[['type'=>'url','label'=>'帮助','link'=>$invalid]]]); throw new RuntimeException('Invalid URL accepted'); }
    catch (crmeb\exceptions\AdminException $expected) {}
}

foreach (['home','detail','user'] as $type) {
    $page = app\services\diy\PageActionsConfig::validatePage(['value'=>[1=>['name'=>'pageTitleBar','title'=>'自定义页面标题','textColor'=>'#333333','headerActions'=>$urlActions]]], $type);
    navCheck($page['value'][1]['headerActions']['right'][0]['link']===$url, $type . ' accepts the basic page title and retains its destination');
}
$hiddenCart = app\services\diy\CartPageConfig::validate(['show_title'=>false,'title_hidden'=>true]);
navCheck(!$hiddenCart['show_title'] && $hiddenCart['title_hidden'], 'cart title removal and visibility survive validation');
