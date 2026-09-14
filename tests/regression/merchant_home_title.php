<?php
require dirname(__DIR__,2).'/crmeb/vendor/autoload.php';
function getLang($value,$replace=[]) { return $value; }
function checkMerchantTitle($name,$ok) { if (!$ok) throw new RuntimeException('FAIL: '.$name); echo 'PASS: '.$name.PHP_EOL; }
use app\services\merchant\MerchantThemeServices;
$legacy=['title'=>'商户首页','value'=>[1000=>['name'=>'shopHeader','timestamp'=>1000]]];
$page=MerchantThemeServices::home($legacy);
$titles=array_filter($page['value'],function($item){return $item['name']==='pageTitleBar';});
$title=reset($titles);
checkMerchantTitle('page metadata does not insert a duplicate storefront title',count($titles)===0 && $page['value'][1000]===$legacy['value'][1000]);
checkMerchantTitle('reading the page repeatedly does not duplicate its title',MerchantThemeServices::home($page)===$page);
$page['value']=array_filter($page['value'],function($item){return $item['name']!=='pageTitleBar';});
checkMerchantTitle('deleted title stays deleted after serialization',MerchantThemeServices::home(json_decode(json_encode($page),true))===$page);
$hidden=$legacy;$hidden['value'][500]=['name'=>'pageTitleBar','timestamp'=>500,'title'=>'自定义标题','isHide'=>true];
$read=MerchantThemeServices::home($hidden);
checkMerchantTitle('existing hidden title and custom text remain unchanged',$read['value']===$hidden['value'] && $read['page_title_mode']==='component');
