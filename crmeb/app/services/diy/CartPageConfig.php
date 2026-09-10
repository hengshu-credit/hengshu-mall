<?php
declare(strict_types=1);
namespace app\services\diy;
use crmeb\exceptions\AdminException;

/** Cart decoration lives alongside the palette in the existing theme JSON. */
class CartPageConfig
{
    public static function validate($value): array
    {
        if (!is_array($value)) throw new AdminException('购物车页面配置格式不正确');
        $result = [];
        if (isset($value['title_actions'])) $result['title_actions'] = PageActionsConfig::header($value['title_actions']);
        foreach (['page_title'=>['购物车',30], 'empty_text'=>['暂无商品',30], 'checkout_text'=>['立即下单',8]] as $key=>$rule) {
            $text=$value[$key]??$rule[0];
            if (!is_string($text)||trim($text)===''||mb_strlen($text)>$rule[1]) throw new AdminException('购物车文案为空或过长');
            $result[$key]=trim($text);
        }
        foreach (['background_color'=>'#F5F5F5','title_background_color'=>'#FFFFFF','title_text_color'=>'#000000','price_color'=>'','button_color'=>'','button_text_color'=>'#FFFFFF'] as $key=>$default) {
            $color=$value[$key]??$default;
            if (isset($value['title_component']) && in_array($key,['title_background_color','title_text_color'],true)) { $result[$key]=$color; continue; }
            if (!is_string($color)||!preg_match('/^(?:#[a-f0-9]{6}|)$/iD',$color)||($color===''&&$default!=='')) throw new AdminException('购物车颜色格式不正确');
            $result[$key]=$color;
        }
        if (!isset($value['title_component']) && !in_array(strtoupper($result['title_text_color']),['#000000','#FFFFFF'],true)) throw new AdminException('标题栏文字请选择黑色或白色');
        foreach (['show_service','show_recommend'] as $key) {
            $flag=$value[$key]??true;
            if (!in_array($flag,[true,false,0,1,'0','1'],true)) throw new AdminException('购物车显示选项不正确');
            $result[$key]=(bool)$flag;
        }
        foreach (['show_title'=>true,'title_hidden'=>false,'show_list'=>true,'show_checkout'=>true,'service_hidden'=>false,'list_hidden'=>false,'checkout_hidden'=>false] as $key=>$default) {
            $flag=$value[$key]??$default;
            if (!in_array($flag,[true,false,0,1,'0','1'],true)) throw new AdminException('购物车组件显示选项不正确');
            $result[$key]=(bool)$flag;
        }
        $labels=$value['service_labels']??['100%正品保证','所有商品精挑细选','售后无忧'];
        if (!is_array($labels)||count($labels)!==3) throw new AdminException('服务保障需配置三条文案');
        foreach ($labels as $label) if (!is_string($label)||trim($label)===''||mb_strlen($label)>16) throw new AdminException('服务保障文案需为1至16个字');
        $result['service_labels']=array_values(array_map('trim',$labels));
        $radius=$value['button_radius']??25;
        if (!is_numeric($radius)||$radius<0||$radius>40) throw new AdminException('购物车按钮圆角超出范围');
        $result['button_radius']=(int)$radius;
        foreach (['service_style','list_style','checkout_style'] as $key) if (isset($value[$key])) $result[$key]=ComponentStyleConfig::validate($value[$key]);
        if (($value['navigation_mode']??'')==='page') {
            $result['navigation_mode']='page';
            $nav=$value['navigation']??[];
            if (!is_array($nav)) throw new AdminException('购物车导航配置格式不正确');
            $result['navigation']=$nav?MainNavigationConfig::validateComponent($nav):[];
        }
        if (isset($value['title_component'])) {
            $result = array_replace($result, PageActionsConfig::titlePageFields(PageActionsConfig::title($value['title_component'])));
        }
        return $result;
    }
}
