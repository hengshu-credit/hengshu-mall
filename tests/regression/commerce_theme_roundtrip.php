<?php
require __DIR__.'/commerce_bootstrap.php';
use think\facade\Db;
$seed=file_get_contents(dirname(__DIR__,2).'/crmeb/public/install/crmeb.sql');
preg_match('/CREATE TABLE IF NOT EXISTS `eb_theme`.*?;/s',$seed,$match);Db::execute($match[0]);
foreach([42,43]as $id)Db::name('theme')->where('id',$id)->delete();
$source=dirname(__DIR__,2).'/.build/storefront-audit/live/';
$read=function($name)use($source){return json_decode(file_get_contents($source.$name.'.json'),true)['data'];};
$home=$read('home');$category=$read('category_theme');$cart=$read('cart_theme');$detail=$read('detail_theme');
$palette=['theme_color'=>'#E93323','gradient_color'=>'#FF7931','sub_color'=>'#FAAD14'];
$rows=['home'=>$home,'category'=>$category,'detail'=>$detail,'cart'=>$cart,'theme'=>$palette];
$service=app()->make(app\services\diy\ThemeServices::class);
foreach([42=>'theme',43=>'merchant']as $id=>$kind){
    Db::name('theme')->insert(['id'=>$id,'title'=>'隔离验收主题','page_type'=>$kind,'is_use'=>$id===42?1:0,'theme_data'=>json_encode($palette),'home_data'=>json_encode($home),'category_data'=>json_encode($category),'detail_data'=>json_encode($detail)]);
    foreach($rows as $page=>$value){
        if($kind==='merchant'&&$page==='cart')continue;
        $service->saveTheme($id,['type'=>$page,'value'=>$value,'tid'=>0,'title'=>'隔离验收主题','page_type'=>$kind]);
        $first=$service->getThemeInfo($id,$page);
        $fresh=app()->make(app\services\diy\ThemeServices::class,[],true)->getThemeInfo($id,$page);
        checkCommerce($first===$fresh,'saved '.$kind.' '.$page.' reloads through real database and ThemeServices');
    }
}
$output=[];foreach(array_keys($rows)as $page)$output[$page]=$service->getThemeInfo(42,$page);
$output['shop']=$service->getThemeInfo(43,'home');$output['shopCategory']=$service->getThemeInfo(43,'category');
$path=dirname(__DIR__,2).'/.build/commerce-hardening-20260914/saved-themes.json';file_put_contents($path,json_encode($output,JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE));
$preview=json_decode(file_get_contents(dirname(__DIR__,2).'/.build/decoration-sync/saved-configs.json'),true);
foreach(['home','category','detail','theme']as $page){
    $service->saveTheme(43,['type'=>$page,'value'=>$preview[$page],'tid'=>0,'title'=>'隔离商户预览','page_type'=>'merchant']);
    $preview[$page]=$service->getThemeInfo(43,$page);
    checkCommerce($preview[$page]===$service->getThemeInfo(43,$page),'merchant preview '.$page.' saves and reloads');
}
file_put_contents(dirname(__DIR__,2).'/.build/commerce-hardening-20260914/preview-themes.json',json_encode($preview,JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE));
echo "Theme roundtrip complete.\n";
