<?php
namespace app\services\merchant;

use app\services\diy\CategoryPageConfig;
use app\services\diy\ThemeServices;
use app\services\diy\PageActionsConfig;
use think\facade\Db;

/** Resolve a merchant's bound theme without changing the mall's active theme. */
class MerchantThemeServices
{
    public static function isMerchant($type): bool { return in_array($type, ['merchant','shop'], true); }

    /** Page names are metadata; only explicitly saved title components render. */
    public static function home(array $page): array
    {
        if (!isset($page['value']) || !is_array($page['value']) || ($page['page_title_mode'] ?? '') === 'component') return $page;
        $page['page_title_mode'] = 'component';
        return $page;
    }

    public static function seed(): array
    {
        $current = Db::name('theme')->where('is_use',1)->where('page_type','theme')->where('is_del',0)->find() ?: [];
        $data = [];
        $home = ['type'=>'home','title'=>'商户首页','name'=>'商户首页','is_show'=>1,'is_bg_color'=>1,'color_picker'=>'#f5f5f5','actions_mode'=>'components','navigation_mode'=>'page','value'=>[
            1000=>['name'=>'shopHeader','timestamp'=>1000,'id'=>'id1000','cname'=>'店铺页头'],
            2000=>['name'=>'recommendGroup','timestamp'=>2000,'id'=>'id2000','cname'=>'推荐组'],
            3000=>['name'=>'shopProducts','timestamp'=>3000,'id'=>'id3000','cname'=>'店铺商品'],
        ]];
        $data['home_data']=$data['home_default_data']=json_encode(self::home($home));
        $data['home_data_update_time']=time();
        foreach (['category','detail','theme'] as $type) {
            $value = $current[$type.'_data'] ?? ($type === 'category' ? '1' : '{}');
            if ($type === 'theme') {
                $palette = json_decode($value,true) ?: [];
                unset($palette['cart_page'],$palette['cart_image']);
                $value = json_encode($palette);
            }
            $data[$type.'_data'] = $data[$type.'_default_data'] = $value;
            $data[$type.'_data_update_time'] = time();
            if ($type !== 'theme') $data[$type.'_image'] = $data[$type.'_default_image'] = $current[$type.'_image'] ?? '';
        }
        return $data;
    }

    public static function resolve(int $shopId, string $type, int $mallThemeId = 0, int $previewId = 0): array
    {
        $shop = (new MerchantServices())->rawShop($shopId);
        if (!(new MerchantServices())->available($shop)) throw new \crmeb\exceptions\ApiException('店铺暂未营业');
        $profile = MerchantVault::decrypt($shop['profile']);
        $id = $previewId ?: (int)($profile['shop_page_id'] ?? 0);
        $theme = $id ? Db::name('theme')->where('id',$id)->whereIn('page_type',['merchant','shop'])->where('is_del',0)->find() : null;
        if ($previewId && !$theme) throw new \crmeb\exceptions\ApiException('预览商户主题不存在');
        $service = app()->make(ThemeServices::class);
        $palette = $theme && $theme['page_type'] === 'merchant' ? $service->getThemeInfo($id,'theme') : $service->getThemeInfo($mallThemeId,'theme');
        if ($type === 'home') $page = $theme ? self::home(json_decode($theme['home_data'],true) ?: []) : [];
        elseif ($type === 'category' && $theme && $theme['page_type'] === 'shop') {
            $home = json_decode($theme['home_data'],true) ?: [];
            $page = $service->getThemeInfo($mallThemeId,'category');
            $page['status'] = (int)($home['shop_category_style'] ?? 1);
        } elseif ($theme && $theme['page_type'] === 'merchant') $page = $service->getThemeInfo($id,$type);
        else $page = $service->getThemeInfo($mallThemeId,$type);
        if ($type === 'detail' && !$page) $page = $service->getThemeInfo($mallThemeId,'detail');
        if ($type === 'category') {
            $navigationThemeId = $theme && $theme['page_type'] === 'merchant' ? $id : $mallThemeId;
            $page['navigation'] = $service->themeNavigation('category', $navigationThemeId);
        }
        return ['shop_id'=>$shopId,'theme_id'=>$theme ? (int)$theme['id'] : 0,'page'=>$page,'palette'=>$palette];
    }
}
