<?php
declare(strict_types=1);

namespace app\services\diy;

use crmeb\exceptions\AdminException;

/** Compatible with the original scalar layout value and the existing theme JSON columns. */
class CategoryPageConfig
{
    public static function defaults(): array
    {
        return ['status' => 1, 'show_title' => 1, 'title_hidden' => 0, 'show_category' => 1, 'category_hidden' => 0, 'search_hidden' => 0,
            'show_search' => 1, 'search_placeholder' => '搜索商品名称',
            'columns' => 3, 'image_fit' => 'contain', 'image_radius' => 8,
            'background_color' => '#FFFFFF', 'active_color' => '',
            'banner_enabled' => 0, 'banner_image' => '', 'banner_link' => '',
            'page_title' => '', 'title_background_color' => '#FFFFFF', 'title_text_color' => '#000000',
            'background_image' => '', 'background_repeat' => 'no-repeat', 'background_size' => '100% auto',
            'show_category_name' => 1, 'show_recommend' => 0, 'recommend_text' => '推荐',
            'product_layout' => 'grid', 'sub_tab_style' => 'solid', 'text_align' => 'left', 'text_bold' => 0,
            'name_lines' => 2, 'show_product_name' => 1, 'buy_button_style' => 1,
            'side_background_color' => '#F7F7F7', 'side_text_color' => '#424242',
            'side_active_text_color' => '', 'side_active_background_color' => '#FFFFFF', 'side_indicator_color' => '',
            'group_title_color' => '#333333', 'category_name_color' => '#333333',
            'sub_tab_text_color' => '#666666', 'sub_tab_background_color' => '#F5F5F5',
            'sub_tab_active_text_color' => '#FFFFFF', 'sub_tab_active_background_color' => '',
            'product_background_color' => '#FFFFFF', 'product_title_color' => '#333333', 'price_color' => '', 'buy_button_color' => ''];
    }

    public static function read($value): array
    {
        if (is_string($value)) $value = json_decode($value, true) ?? $value;
        if (is_scalar($value)) $value = ['status' => $value];
        try { return self::validate(is_array($value) ? $value : []); }
        catch (AdminException $e) { return self::defaults(); }
    }

    public static function validate($value): array
    {
        if (is_scalar($value)) $value = ['status' => $value];
        if (!is_array($value)) throw new AdminException('分类页配置格式不正确');
        $result = self::defaults();
        if ((int)($value['status'] ?? 1) === 2) $result['product_layout'] = 'large';
        if ((int)($value['status'] ?? 1) === 3) $result['product_layout'] = 'list';
        if ((int)($value['status'] ?? 1) === 2) { $result['buy_button_style'] = 8; $result['text_bold'] = 1; }
        if ((int)($value['status'] ?? 1) === 3) $result['buy_button_style'] = 6;
        foreach ($result as $key => $default) {
            if (!array_key_exists($key, $value)) continue;
            if (!is_scalar($value[$key])) throw new AdminException('分类页配置格式不正确');
            $result[$key] = $value[$key];
        }
        foreach (['status' => [1, 3], 'columns' => [2, 4], 'image_radius' => [0, 60],
            'show_title' => [0, 1], 'title_hidden' => [0, 1], 'show_category' => [0, 1], 'category_hidden' => [0, 1], 'search_hidden' => [0, 1],
            'show_search' => [0, 1], 'banner_enabled' => [0, 1], 'show_category_name' => [0, 1],
            'show_recommend' => [0, 1], 'text_bold' => [0, 1], 'name_lines' => [1, 2],
            'show_product_name' => [0, 1], 'buy_button_style' => [0, 8]] as $key => $range) {
            if (!preg_match('/^\d+$/D', (string)$result[$key]) || $result[$key] < $range[0] || $result[$key] > $range[1]) {
                throw new AdminException('分类页布局、列数或显示选项不正确');
            }
            $result[$key] = (int)$result[$key];
        }
        if (!in_array($result['image_fit'], ['contain', 'cover'], true)) throw new AdminException('分类图片显示方式不正确');
        if (!isset($value['title_component']) && !in_array(strtoupper((string)$result['title_text_color']), ['#000000', '#FFFFFF'], true)) throw new AdminException('标题栏文字请选择黑色或白色');
        foreach (array_keys($result) as $key) {
            if (substr($key, -6) !== '_color') continue;
            if (isset($value['title_component']) && in_array($key, ['title_text_color','title_background_color'], true)) continue;
            if ($result[$key] === '' && self::defaults()[$key] === '') continue;
            if (!preg_match('/^#[0-9a-f]{6}$/iD', (string)$result[$key])) throw new AdminException('分类页颜色格式不正确');
        }
        $result['search_placeholder'] = trim((string)$result['search_placeholder']);
        if ($result['search_placeholder'] === '' || mb_strlen($result['search_placeholder']) > 30) throw new AdminException('搜索提示文字需为1至30个字');
        foreach (['page_title' => 30, 'recommend_text' => 12] as $key => $max) {
            $result[$key] = trim((string)$result[$key]);
            if (mb_strlen($result[$key]) > $max) throw new AdminException('分类页标题或推荐文字过长');
        }
        foreach (['product_layout' => ['large', 'grid', 'list'], 'sub_tab_style' => ['solid', 'outline'], 'text_align' => ['left', 'center'],
            'background_repeat' => ['no-repeat', 'repeat', 'repeat-y', 'repeat-x'], 'background_size' => ['100% auto', 'auto 100%', '100% 100%']] as $key => $options) {
            if (!in_array($result[$key], $options, true)) throw new AdminException('分类页样式选项不正确');
        }
        foreach (['banner_image', 'banner_link', 'background_image'] as $key) {
            $result[$key] = trim((string)$result[$key]);
            $url = $result[$key];
            if ($url === '') continue;
            if (strlen($url) > 1000 || preg_match('/[\x00-\x20<>"\\\\]/', $url)) throw new AdminException('分类广告地址格式不正确');
            $valid = $key === 'banner_link' ? preg_match('#^/pages/[a-zA-Z0-9_/-]+(?:\?[^\s]*)?$#D', $url)
                : preg_match('#^(?:/(?!/)|https?://)[^\s]+$#D', $url);
            if (!$valid) throw new AdminException('分类广告图片需为有效地址，跳转链接请选择商城页面');
        }
        if ($result['banner_enabled'] && !$result['banner_image']) throw new AdminException('请先选择分类广告图片');
        if (isset($value['search_actions'])) $result['search_actions'] = PageActionsConfig::header($value['search_actions']);
        if (isset($value['title_actions'])) $result['title_actions'] = PageActionsConfig::header($value['title_actions']);
        if (isset($value['title_component'])) {
            $result = array_replace($result, PageActionsConfig::titlePageFields(PageActionsConfig::title($value['title_component'])));
        }
        if (isset($value['search_component'])) {
            $result['search_component'] = PageActionsConfig::search($value['search_component']);
            $result['search_placeholder'] = $result['search_component']['tipConfig']['value'] ?? '';
            $result['search_actions'] = $result['search_component']['headerActions'];
            $result['search_hidden'] = (int)$result['search_component']['isHide'];
        }

        if (($value['actions_mode'] ?? '') === 'components') {
            $result['actions_mode'] = 'components';
            $result['checkout'] = PageActionsConfig::checkout($value['checkout'] ?? []);
        }
        if (($value['navigation_mode'] ?? '') === 'page') {
            $result['navigation_mode'] = 'page';
            $navigation = $value['navigation'] ?? [];
            if (!is_array($navigation)) throw new AdminException('导航栏配置格式不正确');
            $result['navigation'] = $navigation ? MainNavigationConfig::validateComponent($navigation) : [];
        }
        foreach (['search_style', 'category_style'] as $key) if (isset($value[$key])) $result[$key] = ComponentStyleConfig::validate($value[$key]);
        if (isset($value['layout_configs'])) {
            if (!is_array($value['layout_configs']) || count($value['layout_configs']) > 3) throw new AdminException('分类组件配置格式不正确');
            $result['layout_configs'] = [];
            foreach ($value['layout_configs'] as $key => $layout) {
                if (!in_array((int)$key, [1, 2, 3], true) || !is_array($layout)) throw new AdminException('分类组件配置格式不正确');
                unset($layout['layout_configs'], $layout['navigation'], $layout['navigation_mode']);
                $result['layout_configs'][$key] = self::validate(array_replace($layout, ['status' => (int)$key]));
            }
        }
        return $result;
    }
}
