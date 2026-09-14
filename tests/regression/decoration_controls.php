<?php
error_reporting(E_ALL);
$root=dirname(__DIR__,2).'/crmeb';
$prefixes=require $root.'/vendor/composer/autoload_psr4.php';
spl_autoload_register(function($class)use($prefixes){foreach($prefixes as $prefix=>$dirs)if(strpos($class,$prefix)===0)foreach($dirs as $dir){$file=$dir.'/'.str_replace('\\','/',substr($class,strlen($prefix))).'.php';if(is_file($file)){require $file;return;}}});
function getLang($value,$replace=[]){return $value;}
function checkDecoration($ok,$message){if(!$ok)throw new RuntimeException($message);echo 'PASS: '.$message.PHP_EOL;}
use app\services\diy\ThemeColorConfig;
use app\services\diy\ComponentStyleConfig;
use app\services\diy\MerchantDecorationConfig;
use app\services\diy\RankingDecorationConfig;
foreach(['var(--view-theme)','var(--view-gradient)','var(--view-minorColor)','var(--view-minorColorT)','var(--view-priceColor)','#123456','rgba(1,2,3,0.5)','transparent'] as $color){
 checkDecoration(ThemeColorConfig::valid($color),'supported theme/custom color '.$color);
 ComponentStyleConfig::validate(['componentBgConfig'=>['colorConfig'=>['color'=>[['item'=>$color]]]],'borderConfig'=>['colorConfig'=>['color'=>[['item'=>$color]]]]]);
 RankingDecorationConfig::validatePage(['value'=>[['name'=>'productRank','appearance'=>['detail'=>['textColor'=>$color,'arrowColor'=>$color,'badgeColor'=>$color,'badgeBackground'=>$color]]]]]);
}
foreach(['var(--unknown)','var(--view-theme);position:fixed','url(https://example.com)','expression(alert(1))','#12345','rgba(0,0,0,2)','rgb(256,0,0)'] as $bad)checkDecoration(!ThemeColorConfig::valid($bad),'unknown/injected color rejected');
$group=['title'=>'推荐','subtitle'=>'好物','type'=>'hot','categoryId'=>0,'image'=>['url'=>'']];
foreach([['auto',''],['page','/pages/merchant/category?id=7'],['page','/pages/annex/special/index?theme_id=501'],['url','https://example.com/offers?a=1&b=2#top']] as [$type,$link]){
 $item=$group+['linkType'=>$type,'link'=>$link];$page=['value'=>[['name'=>'recommendGroup','groups'=>[$item],'recommendTitleColor'=>'#222222','recommendSubtitleColor'=>'var(--view-theme)']]];
 $saved=MerchantDecorationConfig::validatePage(json_decode(json_encode($page),true));checkDecoration($saved===$page,'recommendation '.$type.' destination and colors survive validation');
}
foreach(['javascript:alert(1)','//example.com','https://example.com/a b','https://example.com/"x'] as $bad){
 try{MerchantDecorationConfig::validatePage(['value'=>[['name'=>'recommendGroup','groups'=>[$group+['linkType'=>'url','link'=>$bad]]]]]);throw new RuntimeException('Unsafe URL accepted');}catch(crmeb\exceptions\AdminException $expected){}
}
echo "PASS: unsafe recommendation URLs rejected\n";

$scene=json_decode(file_get_contents(dirname(__DIR__,2).'/.build/ranking-review/canvas-tmall_product.json'),true);
$scene['background']='var(--view-theme)';$scene['card']['nodes'][0]['style']['borderColor']='var(--view-gradient)';
app\services\diy\RankingCanvasConfig::validate($scene);
checkDecoration(true,'full-element canvas accepts theme binding');
