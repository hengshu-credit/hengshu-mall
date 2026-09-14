<?php
namespace app\services\diy;
use crmeb\exceptions\AdminException;

class RankingCanvasConfig
{
    private static function fail(): void { throw new AdminException('全元素榜单配置不正确，请检查图层、尺寸、素材或绑定数据'); }
    private static function number($v,float $min,float $max,bool $integer=false): void { if(is_bool($v)||!is_numeric($v)||!is_finite((float)$v)||$v<$min||$v>$max||($integer&&(int)$v!=$v))self::fail(); }
    private static function text($v,int $max=1000): void { if(!is_string($v)||mb_strlen($v)>$max||preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/',$v))self::fail(); }
    private static function url($v): void { self::text($v);if($v!==''&&!preg_match('#^(?:/(?!/)|https?://)[^\s<>"\x27\\\\]+$#D',$v))self::fail(); }
    private static function color($v): void { if(!ThemeColorConfig::valid($v))self::fail(); }
    private static function flag($v): void { if(!is_bool($v))self::fail(); }
    private static function listValue($v,int $max): void { if(!is_array($v)||count($v)>$max||($v&&array_keys($v)!==range(0,count($v)-1)))self::fail(); }
    public static function validate($scene): void
    {
        if(!is_array($scene)||($scene['version']??0)!==1)self::fail();
        self::flag($scene['enabled']??false);self::number($scene['designWidth']??0,280,750,true);
        self::text($scene['fontFamily']??'',120);self::url($scene['fontUrl']??'');self::color($scene['background']??'transparent');self::url($scene['backgroundImage']??'');
        $fonts=$scene['fonts']??[];self::listValue($fonts,6);$families=[];foreach($fonts as $font){if(!is_array($font))self::fail();self::text($font['family']??'',120);self::url($font['url']??'');if(empty($font['family'])||empty($font['url'])||isset($families[$font['family']]))self::fail();$families[$font['family']]=true;}
        if(!in_array($scene['backgroundFit']??'cover',['cover','contain','100% 100%'],true))self::fail();
        self::number($scene['paddingTop']??0,0,2000);self::number($scene['paddingBottom']??0,0,2000);
        $tabs=$scene['tabs']??[];self::listValue($tabs,8);$tabIds=[];
        foreach($tabs as $index=>$tab){if(!is_array($tab))self::fail();self::text($tab['label']??'',32);if(trim($tab['label']??'')==='')self::fail();self::number($tab['rankingId']??0,$index?1:0,2147483647,true);if(isset($tabIds[$tab['rankingId']]))self::fail();$tabIds[$tab['rankingId']]=true;}
        $ids=[];$count=0;
        foreach(['header','card','footer','empty'] as $section){$frame=$scene[$section]??null;if(!is_array($frame))self::fail();self::number($frame['height']??-1,0,3000);self::nodes($frame['nodes']??null,$ids,$count,0);}
        self::number($scene['card']['gap']??0,0,100);
        self::ranges($scene['card']['heights']??[],function($rule){self::number($rule['height']??0,1,3000);});
    }
    private static function ranges($rules,callable $validate): void
    {
        self::listValue($rules,20);$seen=[];
        foreach($rules as $rule){if(!is_array($rule))self::fail();self::number($rule['from']??0,1,100,true);self::number($rule['to']??0,(int)$rule['from'],100,true);for($i=$rule['from'];$i<=$rule['to'];$i++){if(isset($seen[$i]))throw new AdminException('同一元素的名次覆盖区间不能重叠');$seen[$i]=true;}$validate($rule);}
    }
    private static function nodes($nodes,array &$ids,int &$count,int $depth): void
    {
        self::listValue($nodes,150);if($depth>6)self::fail();
        $bindings=['','ranking.name','ranking.description','ranking.window_days','item.name','item.image','item.price','item.rank','item.score','item.sales','item.reviews','item.rating','item.rating_score','item.type_name','item.product_count','item.shop_description','item.review_excerpt','state.message','owner.name','owner.rank'];
        foreach($nodes as $node){if(!is_array($node)||++$count>150)self::fail();self::text($node['id']??'',80);if(empty($node['id'])||isset($ids[$node['id']]))self::fail();$ids[$node['id']]=true;
            if(!in_array($node['kind']??'',['group','text','image','button','stars','tabs','products'],true)||!in_array($node['binding']??'',$bindings,true))self::fail();
            foreach(['label'=>80,'text'=>1000,'prefix'=>100,'suffix'=>100,'productCaption'=>100] as $key=>$max)self::text($node[$key]??'',$max);
            foreach(['visible','hideWhenEmpty','showProductName','showProductPrice'] as $key)if(isset($node[$key]))self::flag($node[$key]);
            self::url($node['image']??'');self::number($node['decimals']??-1,-1,4,true);self::number($node['count']??3,1,6,true);
            if(!in_array($node['action']??'none',['none','product','shop','ranking','rules','back','link'],true))self::fail();
            $link=$node['link']??'';self::text($link,1000);if($link!==''&&!preg_match('#^/pages/[a-zA-Z0-9_/-]+(?:\?[^\s<>"\\\\]*)?$#D',$link))self::fail();
            self::style($node['style']??null);self::ranges($node['rankStyles']??[],function($rule){self::style($rule['style']??null);if(isset($rule['image']))self::url($rule['image']);if(isset($rule['text']))self::text($rule['text']);});self::nodes($node['children']??[],$ids,$count,$depth+1);self::nodes($node['productNodes']??[],$ids,$count,$depth+1);
        }
    }
    private static function style($style): void
    {
        if(!is_array($style)||count($style)>80)self::fail();
        $numbers=['grayscale'=>[0,1],'sepia'=>[0,1],'hueRotate'=>[-180,180],'saturation'=>[0,3],'brightness'=>[0.1,2],'productDesignWidth'=>[50,500],'productItemHeight'=>[20,1000],'x'=>[-2000,2000],'y'=>[-2000,2000],'width'=>[1,2000],'height'=>[1,3000],'zIndex'=>[0,999],'opacity'=>[0,1],'rotate'=>[-360,360],'angle'=>[0,360],'borderWidth'=>[0,20],'radiusTL'=>[0,1000],'radiusTR'=>[0,1000],'radiusBR'=>[0,1000],'radiusBL'=>[0,1000],'shadowX'=>[-100,100],'shadowY'=>[-100,100],'shadowBlur'=>[0,100],'fontSize'=>[6,150],'fontWeight'=>[100,900],'lineHeight'=>[0.5,3],'letterSpacing'=>[-5,30],'paddingX'=>[0,2000],'paddingY'=>[0,2000],'textShadowX'=>[-20,20],'textShadowY'=>[-20,20],'textShadowBlur'=>[0,30],'lines'=>[1,20],'indicatorWidth'=>[0,100],'indicatorHeight'=>[0,10],'columns'=>[1,6],'gap'=>[0,40],'imageHeight'=>[10,400],'productRadius'=>[0,100],'priceSize'=>[6,60],'productTextSize'=>[6,30]];
        $colors=['background','background2','borderColor','shadowColor','color','textShadowColor','activeColor','activeBackground','indicatorColor','starEmptyColor','priceColor','productTextColor','productCaptionBackground'];
        $enums=['fontStyle'=>['normal','italic','oblique'],'textDecoration'=>['none','underline','line-through'],'backgroundPosition'=>['center','top','bottom','left','right'],'backgroundMode'=>['solid','gradient','image'],'backgroundFit'=>['cover','contain','100% 100%'],'borderStyle'=>['solid','dashed','dotted'],'textAlign'=>['left','center','right'],'verticalAlign'=>['top','center','bottom'],'fit'=>['cover','contain','fill'],'clip'=>['none','shield','flag','slope'],'overflow'=>['hidden','visible']];
        foreach($style as $key=>$value){if(isset($numbers[$key]))self::number($value,$numbers[$key][0],$numbers[$key][1],in_array($key,['zIndex','fontWeight','lines','columns'],true));elseif(in_array($key,$colors,true))self::color($value);elseif(isset($enums[$key])){if(!in_array($value,$enums[$key],true))self::fail();}elseif(in_array($key,['shadow','textShadow'],true))self::flag($value);elseif($key==='backgroundImage')self::url($value);elseif($key==='fontFamily')self::text($value,120);else self::fail();}
    }
}
