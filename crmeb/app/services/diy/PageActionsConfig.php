<?php
declare(strict_types=1);
namespace app\services\diy;
use crmeb\exceptions\AdminException;

/** Shared schema for configurable search actions and context-bound commerce bars. */
class PageActionsConfig
{
    const ACTIONS = ['back','home','category','cart','user','collect','share','customer','scan','search','cartManage','link','url'];
    private static function image($url): string
    {
        if (!is_string($url) || strlen($url)>1000 || preg_match('/[\s<>"\\\\]/',$url) || ($url !== '' && !preg_match('#^(?:/(?!/)|https?://)[^\s]+$#D',$url))) throw new AdminException('按钮图标地址不正确');
        return $url;
    }
    private static function color($value): string
    {
        if (!is_string($value) || !preg_match('/^(?:|transparent|#[0-9a-f]{3,8}|rgba?\([0-9.,\s]+\))$/iD',$value)) throw new AdminException('按钮颜色格式不正确');
        return $value;
    }
    private static function flag($value): bool
    {
        if (!in_array($value,[true,false,0,1,'0','1'],true)) throw new AdminException('按钮显示选项不正确');
        return (bool)$value;
    }
    public static function header($value): array
    {
        if (!is_array($value)) throw new AdminException('搜索按钮配置格式不正确');
        $result=['left'=>[],'right'=>[],'color'=>self::color($value['color']??'#333333'),'background'=>self::color($value['background']??'transparent')];
        foreach(['iconSize'=>[16,30,20],'radius'=>[0,30,20]] as $key=>$range){$n=$value[$key]??$range[2];if(!is_numeric($n)||$n<$range[0]||$n>$range[1])throw new AdminException('按钮尺寸超出范围');$result[$key]=(int)$n;}
        foreach(['left','right'] as $side){
            $items=$value[$side]??[];
            if(!is_array($items)||count($items)>3)throw new AdminException('搜索栏每侧最多3个按钮');
            foreach($items as $item){
                if(!is_array($item)||!in_array($item['type']??'',self::ACTIONS,true))throw new AdminException('按钮操作类型不正确');
                $label=$item['label']??'';if(!is_string($label)||trim($label)===''||mb_strlen($label)>8)throw new AdminException('按钮名称需为1至8个字');
                $icon=$item['icon']??'';if(!is_string($icon)||!preg_match('/^[a-zA-Z0-9_ -]{0,100}$/D',$icon))throw new AdminException('按钮图标不正确');
                $link=$item['link']??'';
                if($item['type']==='link'&&(!is_string($link)||strlen($link)>1000||preg_match('/[\x00-\x20<>"\\\\]/',$link)||!preg_match('#^/pages/[a-zA-Z0-9_/-]+(?:\?[^\s]*)?$#D',$link)))throw new AdminException('按钮链接请选择商城内部页面');
                if($item['type']==='url'&&(!is_string($link)||strlen($link)>1000||!preg_match('~^https?://(?:[a-z0-9.-]+|\[[0-9a-f:]+\])(?::\d{1,5})?(?:[/?#][^\s<>"\\\\]*)?$~iD',$link)))throw new AdminException('按钮网址请填写有效的 HTTP(S) 地址');
                $result[$side][]=['type'=>$item['type'],'label'=>trim($label),'icon'=>$icon,'image'=>self::image($item['image']??''),
                    'link'=>in_array($item['type'],['link','url'],true)?$link:'','enabled'=>self::flag($item['enabled']??true),'showLabel'=>self::flag($item['showLabel']??false)];
            }
        }
        return $result;
    }
    public static function title($value): array
    {
        if (!is_array($value) || ($value['name'] ?? '') !== 'pageTitleBar') throw new AdminException('页面标题组件格式不正确');
        $title = $value['title'] ?? '页面标题';
        if (!is_string($title) || trim($title) === '' || mb_strlen($title) > 30) throw new AdminException('页面标题需为1至30个字');
        $value['title'] = trim($title);
        $value['textColor'] = self::color($value['textColor'] ?? '#000000');
        $value['headerActions'] = self::header($value['headerActions'] ?? []);
        $value['isHide'] = self::flag($value['isHide'] ?? false);
        ComponentStyleConfig::validate($value);
        return $value;
    }
    public static function search($value): array
    {
        if (!is_array($value) || ($value['name'] ?? '') !== 'headerSerch') throw new AdminException('搜索框组件格式不正确');
        $value['headerActions'] = self::header($value['headerActions'] ?? []);
        $value['isHide'] = self::flag($value['isHide'] ?? false);
        foreach (['titleConfig'=>30, 'tipConfig'=>30] as $key=>$max) {
            $text = $value[$key]['value'] ?? '';
            if (!is_string($text) || mb_strlen($text) > $max) throw new AdminException('搜索框文字过长');
        }
        foreach (['styleConfig'=>1,'styleTypeConfig'=>2,'txtFixConfig'=>2,'txtStyleConfig'=>2,'setUp'=>1] as $key=>$max) {
            $tab = $value[$key]['tabVal'] ?? 0;
            if (!is_numeric($tab) || $tab < 0 || $tab > $max) throw new AdminException('搜索框样式选项不正确');
        }
        foreach (['txtColor','tipColor','hotWordsColor','searchBoxColor'] as $key) {
            foreach (($value[$key]['color'] ?? []) as $color) self::color($color['item'] ?? '');
        }
        self::image($value['logoConfig']['url'] ?? '');
        $link = $value['linkConfig']['value'] ?? '';
        if (!is_string($link) || strlen($link) > 1000 || ($link !== '' && !preg_match('#^/pages/[a-zA-Z0-9_/-]+(?:\?[^\s<>"\\\\]*)?$#D', $link))) throw new AdminException('搜索框链接请选择商城页面');
        ComponentStyleConfig::validate($value);
        return $value;
    }
    public static function titlePageFields(array $title): array
    {
        return ['title_component'=>$title, 'page_title'=>$title['title'],
            'title_actions'=>$title['headerActions'], 'title_text_color'=>$title['textColor'],
            'title_background_color'=>self::color($title['componentBgConfig']['colorConfig']['color'][0]['item'] ?? '#FFFFFF'),
            'title_hidden'=>(int)$title['isHide']];
    }
    public static function checkout($value): array
    {
        if(!is_array($value))throw new AdminException('结算栏配置格式不正确');
        if(!$value)return [];
        $result=['name'=>'categoryCheckout','cname'=>'分类结算栏','setUp'=>['tabVal'=>0]];
        foreach(['isHide'=>false,'showCart'=>true,'showAmount'=>true,'showButton'=>true] as $key=>$default)$result[$key]=self::flag($value[$key]??$default);
        $label=$value['buttonText']??'去结算';if(!is_string($label)||trim($label)===''||mb_strlen($label)>8)throw new AdminException('结算按钮文字需为1至8个字');$result['buttonText']=trim($label);
        $buttonStyle=$value['buttonStyle']??'text';if(!in_array($buttonStyle,['text','solid'],true))throw new AdminException('结算按钮样式不正确');$result['buttonStyle']=$buttonStyle;
        foreach(['priceColor'=>'','buttonColor'=>'','buttonTextColor'=>''] as $key=>$default)$result[$key]=self::color($value[$key]??$default);
        $radius=$value['buttonRadius']??22;if(!is_numeric($radius)||$radius<0||$radius>30)throw new AdminException('结算按钮圆角超出范围');$result['buttonRadius']=(int)$radius;
        $result['iconImage']=self::image($value['iconImage']??'');
        $result['activeIconImage']=self::image($value['activeIconImage']??'');
        $result['cartDisplay']=$value['cartDisplay']??'icon';
        if(!in_array($result['cartDisplay'],['text','icon','both'],true))throw new AdminException('购物车入口展示方式不正确');
        $label=$value['cartText']??'购物车';
        if(!is_string($label)||trim($label)===''||mb_strlen($label)>8)throw new AdminException('购物车入口文字需为1至8个字');
        $result['cartText']=trim($label);
        foreach(['cartColor','activeCartColor'] as $key)$result[$key]=self::color($value[$key]??'');
        $result['barLayout']=$value['barLayout']??'standard';
        if(!in_array($result['barLayout'],['standard','floating'],true))throw new AdminException('结算栏布局不正确');
        foreach(['showDetails','showButtonCount'] as $key)$result[$key]=self::flag($value[$key]??false);
        foreach(['detailsColor'=>'#999999','cartBackground'=>''] as $key=>$default)$result[$key]=self::color($value[$key]??$default);
        $label=$value['detailsText']??'查看明细';
        if(!is_string($label)||trim($label)===''||mb_strlen($label)>8)throw new AdminException('明细入口文字需为1至8个字');
        $result['detailsText']=trim($label);
        $size=$value['cartIconSize']??28;
        if(!is_numeric($size)||$size<16||$size>40)throw new AdminException('购物车图标尺寸超出范围');
        $result['cartIconSize']=(int)$size;
        return array_replace($result,ComponentStyleConfig::validate($value));
    }
    public static function validatePage(array $page,string $type): array
    {
        $count=0;
        foreach(($page['value']??[]) as $key=>$component){
            if(!is_array($component))continue;
            if(isset($component['headerActions']))$component['headerActions']=self::header($component['headerActions']);
            if(($component['name']??'')==='pageTitleBar') $component=self::title($component);
            if(($component['name']??'')==='bottomMenu'){
                if($type!=='detail')throw new AdminException('商品操作栏仅可添加到商品详情页');
                if(++$count>1)throw new AdminException('商品操作栏只能添加一次');
                if(isset($component['showContent']['type'])){
                    if(!is_array($component['showContent']['type'])||count($component['showContent']['type'])>5)throw new AdminException('商品操作入口最多5项');
                    foreach($component['showContent']['type'] as $id)if(!in_array($id,[0,1,2,3,4,5],true))throw new AdminException('商品操作入口不正确');
                }
                foreach(['cartButton','buyButton'] as $field)if(isset($component[$field])&&!in_array($component[$field]['tabVal']??null,[0,1],true))throw new AdminException('商品按钮显示选项不正确');
                ComponentStyleConfig::validate($component);
            }
            $page['value'][$key]=$component;
        }
        return $page;
    }
}
