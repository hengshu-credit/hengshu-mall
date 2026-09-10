<?php
require __DIR__ . '/main_navigation.php';
$actions = ['left'=>[['type'=>'home','label'=>'首页','icon'=>'icon-shouye6','image'=>'/uploads/original.svg','enabled'=>true,'showLabel'=>true]],'right'=>[['type'=>'collect','label'=>'收藏','enabled'=>true,'showLabel'=>false]],'iconSize'=>22,'color'=>'#123456','background'=>'transparent','radius'=>12];
$page = ['actions_mode'=>'components','value'=>['search'=>['name'=>'headerSerch','headerActions'=>$actions],'bar'=>['name'=>'bottomMenu','showContent'=>['type'=>[4,1]],'cartButton'=>['tabVal'=>0],'buyButton'=>['tabVal'=>1]]]];
$saved = app\services\diy\PageActionsConfig::validatePage($page,'detail');
navCheck($saved['value']['search']['headerActions']['left'][0]['image'] === '/uploads/original.svg','header action originals survive validation');
navCheck($saved['value']['bar']['buyButton']['tabVal'] === 1,'independent purchase visibility survives');
$category = ['status'=>3,'actions_mode'=>'components','search_actions'=>$actions,'checkout'=>['name'=>'categoryCheckout','isHide'=>false,'showAmount'=>false,'buttonText'=>'确认结算']];
$checked = app\services\diy\CategoryPageConfig::validate($category);
navCheck($checked['checkout']['showAmount'] === false && $checked['checkout']['buttonText'] === '确认结算','checkout configuration roundtrips');
navCheck($checked['checkout']['buttonStyle'] === 'text','checkout defaults retain the compact text action');
$category['checkout']['buttonStyle']='solid';
navCheck(app\services\diy\CategoryPageConfig::validate($category)['checkout']['buttonStyle'] === 'solid','filled checkout button style is configurable');
$category['checkout']=array_replace($category['checkout'],['barLayout'=>'floating','cartDisplay'=>'both','cartText'=>'购物袋','activeIconImage'=>'/uploads/active.svg','showDetails'=>true,'detailsText'=>'查看明细','showButtonCount'=>true,'cartBackground'=>'#FF5A24','cartIconSize'=>24]);
$floating=app\services\diy\CategoryPageConfig::validate($category)['checkout'];
navCheck($floating['barLayout']==='floating'&&$floating['showDetails']&&$floating['showButtonCount']&&$floating['cartIconSize']===24,'floating checkout, details and quantity options survive validation');
navCheck($floating['activeIconImage']==='/uploads/active.svg'&&$floating['cartDisplay']==='both','independent selected icon and text/icon mode survive saving');
$category['checkout']=[];
navCheck(app\services\diy\CategoryPageConfig::validate($category)['checkout'] === [],'deleting checkout preserves absence');
foreach (['javascript:alert(1)','https://outside.test/page'] as $unsafe) {
  $bad=$actions;$bad['right']=[['type'=>'link','label'=>'链接','link'=>$unsafe]];
  try {app\services\diy\PageActionsConfig::header($bad);throw new RuntimeException('unsafe action accepted');}catch(crmeb\exceptions\AdminException $e){}
}
try {app\services\diy\PageActionsConfig::validatePage($page,'home');throw new RuntimeException('product actions accepted on home');}catch(crmeb\exceptions\AdminException $e){}
$page['value']['duplicate']=$page['value']['bar'];
try {app\services\diy\PageActionsConfig::validatePage($page,'detail');throw new RuntimeException('duplicate product toolbar accepted');}catch(crmeb\exceptions\AdminException $e){}
navCheck(true,'unsafe action URLs, wrong page context and duplicate operation bars are rejected');
