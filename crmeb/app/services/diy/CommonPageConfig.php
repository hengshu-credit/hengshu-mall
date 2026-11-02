<?php
declare(strict_types=1);
namespace app\services\diy;

use crmeb\exceptions\AdminException;

class CommonPageConfig
{
    public const PAGES = ['goodsList','goodsSearch','orderList','orderDetail','orderPayStatus','merchantStreet','merchantFollowed','merchantRanking','userSubpage','activityList','activityDetail','pointsMall','newsList','newsDetail'];

    private static function defaults(string $page): array
    {
        $defaults = [
            'page_key' => $page, 'page_title' => '', 'show_title' => true, 'title_color' => '#222222',
            'title_background_color' => '#FFFFFF', 'background_color' => '#F5F5F5', 'background_image' => '',
            'show_search' => false, 'search_placeholder' => '搜索商品名称', 'search_background_color' => '#FFFFFF',
            'search_text_color' => '#333333', 'list_layout' => 'list', 'card_background_color' => '#FFFFFF',
            'card_radius' => 16, 'card_gap' => 12, 'card_title_color' => '#333333', 'price_color' => '',
            'empty_text' => '暂无内容', 'show_recommend' => true, 'navigation_mode' => 'home',
        ];
        $overrides = [
            'goodsList' => ['show_search'=>true,'list_layout'=>'grid','empty_text'=>'暂无商品，去看点别的吧'],
            'goodsSearch' => ['show_search'=>true,'empty_text'=>'暂无搜索结果'],
            'orderList' => ['empty_text'=>'暂无订单'],
            'orderDetail' => ['show_recommend'=>false],
            'orderPayStatus' => ['show_recommend'=>false],
            'merchantStreet' => ['show_search'=>true,'search_placeholder'=>'搜索店铺名称','empty_text'=>'暂无营业店铺','card_radius'=>24,'card_gap'=>22],
            'merchantFollowed' => ['empty_text'=>'你还没有关注店铺','card_radius'=>24,'card_gap'=>24],
            'merchantRanking' => ['empty_text'=>'暂无上榜商品','show_recommend'=>false,'card_radius'=>24,'card_gap'=>22],
            'userSubpage' => ['show_recommend'=>false],
            'activityList' => ['empty_text'=>'暂无活动'],
            'activityDetail' => ['show_recommend'=>false],
            'pointsMall' => ['empty_text'=>'暂无积分商品'],
            'newsDetail' => ['show_recommend'=>false],
        ];
        return array_merge($defaults, $overrides[$page] ?? []);
    }

    private static function color($value, string $label): string
    {
        if (!is_string($value) || !preg_match('/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/iD', $value)) throw new AdminException($label . '请输入有效的 HEX 色值');
        return strtoupper($value);
    }

    public static function page($value, string $page): array
    {
        if (!in_array($page, self::PAGES, true)) throw new AdminException('通用页面标识不正确');
        $source = is_array($value) ? $value : [];
        $result = self::defaults($page);
        foreach ($result as $key => $default) if (array_key_exists($key, $source)) $result[$key] = $source[$key];
        foreach (['title_color'=>'标题颜色','title_background_color'=>'标题背景色','background_color'=>'页面背景色','search_background_color'=>'搜索框背景色','search_text_color'=>'搜索文字色','card_background_color'=>'卡片背景色','card_title_color'=>'卡片标题色'] as $key => $label) $result[$key] = self::color($result[$key], $label);
        if ($result['price_color'] !== '') $result['price_color'] = self::color($result['price_color'], '价格颜色');
        $result['show_title'] = (bool)$result['show_title']; $result['show_search'] = (bool)$result['show_search']; $result['show_recommend'] = (bool)$result['show_recommend'];
        $result['card_radius'] = max(0, min(60, (int)$result['card_radius'])); $result['card_gap'] = max(0, min(60, (int)$result['card_gap']));
        if (!in_array($result['list_layout'], ['grid','list'], true)) throw new AdminException('通用页面列表布局不正确');
        if (!in_array($result['navigation_mode'], ['home','custom','none'], true)) throw new AdminException('通用页面导航配置不正确');
        foreach (['page_title','search_placeholder','background_image','empty_text'] as $key) if (!is_string($result[$key]) || mb_strlen($result[$key]) > 80) throw new AdminException('通用页面文案长度不正确');
        if ($result['background_image'] !== '' && !preg_match('#^(?:/(?!/)|https?://)[^\s]+$#D', $result['background_image'])) throw new AdminException('通用页面背景图地址不正确');
        return $result;
    }

    public static function pages($value): array
    {
        if (!is_array($value)) throw new AdminException('通用页面配置格式不正确');
        $result = [];
        foreach (self::PAGES as $page) $result[$page] = self::page($value[$page] ?? [], $page);
        return $result;
    }
}
