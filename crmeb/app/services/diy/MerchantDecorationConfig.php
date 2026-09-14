<?php
namespace app\services\diy;

use crmeb\exceptions\AdminException;

class MerchantDecorationConfig
{
    const NAMES = ['shopStreet','recommendGroup','productRanking','productRank','shopInfo','shopProducts','shopHeader','shopFollow'];
    public static function validatePage($page): array
    {
        if (!is_array($page) || !is_array($page['value'] ?? null) || count($page['value']) > 100) throw new AdminException('装修组件格式不正确');
        foreach ($page['value'] as &$component) {
            if (!is_array($component)) throw new AdminException('装修组件格式不正确');
            if (isset($component['showMerchantName'])) self::flag($component['showMerchantName']);
            if (!in_array($component['name'] ?? '', self::NAMES, true)) continue;
            ComponentStyleConfig::validate($component);
            foreach(['recommendTitleColor','recommendSubtitleColor'] as $color)if(isset($component[$color])&&!ThemeColorConfig::valid($component[$color]))throw new AdminException('推荐组颜色配置不正确');
            foreach (['isHide','showTitle','showMore','showMerchantName','showLogo','showDescription','showScores','showProducts','showSearch','showSort','showFollow','showFollowers'] as $key) if (isset($component[$key])) self::flag($component[$key]);
            foreach (['followText'=>12,'followedText'=>12,'searchPlaceholder'=>30] as $key=>$max) if (isset($component[$key])) self::text($component[$key],$max);
            if (isset($component['showNavigation'])) self::flag($component['showNavigation']);
            if (isset($component['headerLayout']) && !in_array($component['headerLayout'],[0,1,2],true)) throw new AdminException('店铺页头样式不正确');
            foreach (['title'=>30,'moreText'=>12,'buttonText'=>12,'productTitle'=>30] as $key=>$max) if (isset($component[$key])) self::text($component[$key], $max);
            foreach (['limit'=>[1,50], 'columns'=>[1,4], 'shopId'=>[0,2147483647], 'typeId'=>[0,2147483647], 'categoryId'=>[0,2147483647], 'topN'=>[1,100]] as $key=>$range) {
                if (isset($component[$key]) && (!is_numeric($component[$key]) || (int)$component[$key] != $component[$key] || $component[$key] < $range[0] || $component[$key] > $range[1])) throw new AdminException('组件数量或筛选条件不正确');
            }
            foreach (['rankType'=>['sales','rating'],'rankScope'=>['all','category','shop'],'sort'=>['default','sales','new','price_asc','price_desc']] as $key=>$values) if (isset($component[$key]) && !in_array($component[$key], $values, true)) throw new AdminException('组件排序选项不正确');
            if (isset($component['rankTypes']) && (!is_array($component['rankTypes']) || !$component['rankTypes'] || count($component['rankTypes']) > 2 || array_diff($component['rankTypes'], ['sales','rating']))) throw new AdminException('请选择有效榜单');
            if (isset($component['shopIds'])) {
                if (!is_array($component['shopIds']) || count($component['shopIds']) > 50) throw new AdminException('最多选择50家店铺');
                foreach ($component['shopIds'] as $id) if (filter_var($id, FILTER_VALIDATE_INT) === false || $id < 1) throw new AdminException('店铺编号不正确');
            }
            if (($component['name'] ?? '') === 'recommendGroup') {
                if (!is_array($component['groups'] ?? null) || count($component['groups']) < 1 || count($component['groups']) > 8) throw new AdminException('推荐组需包含1至8项');
                foreach ($component['groups'] as $group) {
                    self::text($group['title'] ?? '', 12); self::text($group['subtitle'] ?? '', 20);
                    if (!in_array($group['type'] ?? '', ['new','hot','best','benefit'], true)) throw new AdminException('推荐类型不正确');
                    if (filter_var($group['categoryId'] ?? 0, FILTER_VALIDATE_INT) === false || ($group['categoryId'] ?? 0) < 0) throw new AdminException('推荐分类不正确');
                    $link = $group['link'] ?? '';
                    if(!is_string($link))throw new AdminException('推荐链接格式不正确');
                    $linkType=$group['linkType']??($link===''?'auto':(preg_match('#^https?://#i',$link)?'url':'page'));
                    if(!in_array($linkType,['auto','page','url'],true))throw new AdminException('推荐跳转类型不正确');
                    if($linkType==='auto'){if($link!=='')throw new AdminException('自动推荐不应填写跳转链接');}
                    elseif($linkType==='url'){if(!is_string($link)||strlen($link)>1000||!preg_match('~^https?://(?:[a-z0-9.-]+|\[[0-9a-f:]+\])(?::\d{1,5})?(?:[/?#][^\s<>"\\\\]*)?$~iD',$link))throw new AdminException('推荐网址请填写有效的 HTTP(S) 地址');}
                    elseif(!is_string($link)||strlen($link)>1000||!preg_match('#^/pages/[a-zA-Z0-9_/-]+(?:\?[^\s<>"\\\\]*)?$#D',$link))throw new AdminException('请选择有效的商城页面');
                    $image = $group['image']['url'] ?? '';
                    if (!is_string($image) || strlen($image) > 1000 || ($image !== '' && (!preg_match('#^(?:/(?!/)|https?://)[^\s<>"\\\\]+$#D', $image)))) throw new AdminException('推荐图片地址不正确');
                }
            }
        }
        return $page;
    }
    private static function flag($value): void
    {
        if (!in_array($value, [true,false,0,1,'0','1'], true)) throw new AdminException('组件显示选项不正确');
    }
    private static function text($value, int $max): void
    {
        if (!is_string($value) || mb_strlen($value) > $max || preg_match('/[\x00-\x1F<>]/', $value)) throw new AdminException('组件文字格式或长度不正确');
    }
}
