<?php
namespace app\services\diy;
use app\services\activity\ranking\RankingConfig;
use crmeb\exceptions\AdminException;

class RankingDecorationConfig
{
    public static function validatePage(array $page): array
    {
        foreach ($page['value']??[] as $key=>$item) {
            if (!in_array($item['name']??'',['marketingRanking','marketingRankInfo','productRank'],true)) continue;
            ComponentStyleConfig::validate($item);
            RankingConfig::integer($item['limit']??1,1,100,'榜单展示数量');
            if ($item['name'] !== 'marketingRanking') { $item['limit']=1; $page['value'][$key]=$item; }
            if ($item['name']==='marketingRanking') RankingConfig::integer($item['rankingId']??0,0,2147483647,'榜单编号');
            foreach (['showTitle','showDescription','showMore','showScore','isHide'] as $key) if (isset($item[$key]) && !in_array($item[$key],[true,false,0,1],true)) throw new AdminException('榜单组件开关不正确');
            if (isset($item['title']) && (!is_string($item['title']) || mb_strlen($item['title'])>60 || preg_match('/[<>\x00-\x1F]/',$item['title']))) throw new AdminException('榜单组件标题不正确');
            if (isset($item['accentColor']) && !preg_match('/^#[0-9a-fA-F]{6}$/D',$item['accentColor'])) throw new AdminException('榜单强调色不正确');
            if (isset($item['appearance'])) self::appearance($item['appearance']);
        }
        return $page;
    }

    private static function appearance($value): void
    {
        if (!is_array($value)) throw new AdminException('排行榜样式格式不正确');
        if(isset($value['canvas'])) { RankingCanvasConfig::validate($value['canvas']); unset($value['canvas']); }
        if (isset($value['followTheme']) && !is_bool($value['followTheme'])) throw new AdminException('跟随主题色开关不正确');
        $groups = ['header','content','footer','empty','detail','ranks','panel','commerce'];
        foreach ($groups as $key) if (isset($value[$key]) && !is_array($value[$key])) throw new AdminException('排行榜样式分组不正确');
        if (isset($value['header']['surface']) && !is_array($value['header']['surface'])) throw new AdminException('排行榜榜头背景格式不正确');
        if (isset($value['content']['imageFit']) && !in_array($value['content']['imageFit'],['cover','contain'],true)) throw new AdminException('商品图片缩放方式不正确');
        if (isset($value['content']['order'])) {
            $order=$value['content']['order'];
            if (!is_array($order) || count($order)!==4 || count(array_unique($order))!==4 || array_diff($order,['name','price','metrics','button'])) throw new AdminException('卡片内容顺序不正确');
        }
        if (isset($value['ranks'])) {
            if (array_diff(array_keys($value['ranks']),['top1','top2','top3','normal'])) throw new AdminException('名次样式分组不正确');
            foreach ($value['ranks'] as $rank) self::rankShape($rank);
        }
        $ranges=$value['ranges']??[];
        if (!is_array($ranges) || count($ranges)>20) throw new AdminException('最多配置20个名次区间');
        $seen=[];
        foreach ($ranges as $range) {
            if (!is_array($range)) throw new AdminException('名次区间不正确');
            $from=RankingConfig::integer($range['from']??0,1,100,'起始名次');
            $to=RankingConfig::integer($range['to']??0,$from,100,'结束名次');
            for($i=$from;$i<=$to;$i++) { if(isset($seen[$i])) throw new AdminException('自定义名次区间不能重叠'); $seen[$i]=true; }
            self::rankShape($range['style']??null);
        }
        $count=0; self::walk($value,'',0,$count);
    }
    private static function rankShape($rank): void
    {
        if (!is_array($rank)) throw new AdminException('名次样式格式不正确');
        foreach (['card','badge'] as $key) if (isset($rank[$key]) && !is_array($rank[$key])) throw new AdminException('名次卡片或标识样式不正确');
    }
    private static function walk($value, string $key, int $depth, int &$count): void
    {
        if (++$count>8000 || $depth>8) throw new AdminException('排行榜样式数据过多');
        if (is_array($value)) { foreach($value as $k=>$v) self::walk($v,(string)$k,$depth+1,$count); return; }
        $flags=['shadow','visible','bold','showText','showOverline','titleBold','showImage','showName','nameBold','showPrice','priceBold','showSales','showReviews','showRating','showProductCount','showButton','show','hide','showArrow','showShopLabel','separateTop','followTheme','stacked','reverse','showStars','showType','showShopDescription'];
        if (in_array($key,$flags,true)) { if(!is_bool($value)) throw new AdminException('排行榜样式开关不正确'); return; }
        $enums=['cardLayout'=>['standard','commerce','retail','shop'],'highlightMetric'=>['none','score','sales','reviews','rating'],'layout'=>['list','podium','grid'],'preset'=>['gold','hot','review','tmall_product','tmall_shop','dianping_shop'],'mode'=>['solid','gradient','image'],'imageFit'=>['cover','contain','100% 100%'],'imagePosition'=>['center','top','bottom','left','right'],'borderStyle'=>['solid','dashed','dotted'],'align'=>['left','center','right'],'badgePosition'=>['side','image','corner'],'shape'=>['text','ribbon','medal','pill','square','image','shield','crown','flag']];
        if(isset($enums[$key])) { if(!in_array($value,$enums[$key],true)) throw new AdminException('排行榜样式选项不正确'); return; }
        if (in_array($key,['image','icon','customImage'],true)) {
            if (!is_string($value) || strlen($value)>1000 || ($value!=='' && !preg_match('#^(?:/(?!/)|https?://)[^\s<>"\x27\\\\]+$#D',$value))) throw new AdminException('排行榜图片地址不正确');
            return;
        }
        if (preg_match('/(?:Color|Background)$/D',$key) || in_array($key,['color','color2'],true)) {
            if (!ThemeColorConfig::valid($value)) throw new AdminException('排行榜样式颜色不正确');
            return;
        }
        $numbers=['panelPadding'=>[0,40],'paddingX'=>[0,30],'paddingY'=>[0,24],'labelSize'=>[6,20],'numberSize'=>[10,40],'starSize'=>[10,24],'highlightSize'=>[10,20],'highlightPadding'=>[0,16],'highlightRadius'=>[0,20],'version'=>[1,1],'columns'=>[1,3],'gap'=>[0,40],'padding'=>[0,60],'imageGap'=>[0,40],'podiumLift'=>[0,50],'angle'=>[0,360],'borderWidth'=>[0,10],'radius'=>[0,100],'shadowBlur'=>[0,60],'shadowX'=>[-30,30],'shadowY'=>[-30,30],'overlineSize'=>[8,32],'overlineSpacing'=>[0,10],'titleSize'=>[12,40],'descriptionSize'=>[8,24],'iconSize'=>[12,100],'moreSize'=>[8,24],'imageWidth'=>[24,160],'imageHeight'=>[24,180],'gridImageHeight'=>[40,260],'podiumImageSize'=>[24,100],'imageRadius'=>[0,90],'imageBorderWidth'=>[0,8],'nameSize'=>[10,28],'nameLines'=>[1,4],'priceSize'=>[10,32],'metaSize'=>[8,24],'buttonBorderWidth'=>[0,8],'buttonRadius'=>[0,50],'buttonSize'=>[10,24],'buttonPaddingX'=>[0,30],'buttonPaddingY'=>[0,20],'fontSize'=>[8,40],'arrowSize'=>[12,40],'width'=>[16,120],'height'=>[16,100],'from'=>[1,100],'to'=>[1,100]];
        if(isset($numbers[$key])) { RankingConfig::integer($value,$numbers[$key][0],$numbers[$key][1],'排行榜尺寸'); return; }
        if($key==='lineHeight') { if(!is_numeric($value) || !is_finite((float)$value) || $value<1 || $value>2.5) throw new AdminException('排行榜文字行高不正确'); return; }
        if(!is_string($value) || mb_strlen($value)>300 || preg_match('/[<>\x00-\x1F]/',$value)) throw new AdminException('排行榜样式文本不正确');
    }
}
