<?php
declare(strict_types=1);

namespace app\services\diy;

use crmeb\exceptions\AdminException;

/** Edits the existing pageFoot component without replacing unrelated home content. */
class MainNavigationConfig
{
    const PAGES = ['/pages/index/index', '/pages/goods_cate/goods_cate', '/pages/order_addcart/order_addcart', '/pages/user/index'];

    public static function defaults(): array
    {
        $menus = [];
        foreach (['首页', '分类', '购物车', '我的'] as $i => $name) {
            $menus[] = ['name' => $name, 'link' => self::PAGES[$i], 'icon' => '/static/images/' . ($i + 1) . '-001.png',
                'selected_icon' => '/static/images/' . ($i + 1) . '-002.png'];
        }
        return ['name' => '主导航栏', 'enabled' => 1, 'background_mode' => 'system', 'background_color' => '#FFFFFF',
            'corner' => 0, 'text_mode' => 'system', 'text_color' => '#333333', 'selected_color' => '#E93323',
            'display' => 0, 'visible_pages' => self::PAGES, 'menus' => $menus];
    }

    public static function component(array $home): array
    {
        foreach (($home['value'] ?? []) as $item) {
            if (is_array($item) && in_array(strtolower($item['name'] ?? ''), ['pagefoot', 'mainnavigation'], true)) return $item;
        }
        return [];
    }

    public static function read(array $home): array
    {
        $nav = self::component($home);
        $result = self::defaults();
        if (!$nav) return $result;
        $meta = $nav['mainNavigation'] ?? [];
        $result['name'] = $meta['title'] ?? '主导航栏';
        $result['enabled'] = !empty($nav['effectConfig']['tabVal']) && empty($nav['isHide']) ? 1 : 0;
        $result['background_mode'] = $meta['backgroundMode'] ?? 'custom';
        $result['background_color'] = $nav[empty($nav['navConfig']['tabVal']) ? 'bgColor' : 'bgColor2']['color'][0]['item'] ?? '#FFFFFF';
        $result['corner'] = (int)($meta['corner'] ?? 0);
        $result['text_mode'] = empty($nav['toneConfig']['tabVal']) ? 'system' : 'custom';
        $result['text_color'] = $nav['txtColor']['color'][0]['item'] ?? '#333333';
        $result['selected_color'] = $nav['activeTxtColor']['color'][0]['item'] ?? '#E93323';
        $result['display'] = (int)($nav['navStyleConfig']['tabVal'] ?? 0);
        $result['visible_pages'] = $meta['visiblePages'] ?? self::PAGES;
        if (isset($nav['menuList']) && is_array($nav['menuList'])) {
            $result['menus'] = array_map(function ($item) {
                return ['name' => $item['name'] ?? '', 'link' => $item['link'] ?? '',
                    'icon' => $item['imgList'][1] ?? '', 'selected_icon' => $item['imgList'][0] ?? ''];
            }, $nav['menuList']);
        }
        return $result;
    }

    public static function validate($value): array
    {
        if (!is_array($value)) throw new AdminException('主导航配置格式不正确');
        $config = array_replace(self::defaults(), array_intersect_key($value, self::defaults()));
        foreach (['name', 'background_mode', 'background_color', 'text_mode', 'text_color', 'selected_color'] as $key) {
            if (!is_string($config[$key])) throw new AdminException('主导航配置格式不正确');
            $config[$key] = trim($config[$key]);
        }
        if ($config['name'] === '' || mb_strlen($config['name']) > 15) throw new AdminException('导航名称需为1至15个字');
        foreach (['enabled' => [0, 1], 'corner' => [0, 12, 24], 'display' => [0, 1, 2]] as $key => $options) {
            if (!is_scalar($config[$key]) || !preg_match('/^\d+$/D', (string)$config[$key]) || !in_array((int)$config[$key], $options, true)) throw new AdminException('导航显示选项不正确');
            $config[$key] = (int)$config[$key];
        }
        foreach (['background_mode', 'text_mode'] as $key) {
            if (!in_array($config[$key], ['system', 'custom'], true)) throw new AdminException('导航配色选项不正确');
        }
        foreach (['background_color', 'text_color', 'selected_color'] as $key) {
            $color = $config[$key];
            $valid = preg_match('/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/iD', $color);
            if (!$valid && preg_match('/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/D', $color, $parts)) {
                $valid = max((int)$parts[1], (int)$parts[2], (int)$parts[3]) <= 255 && (strpos($color, 'rgba(') === 0) === isset($parts[4]);
            }
            if (!$valid) throw new AdminException('导航颜色格式不正确');
        }
        if (!is_array($config['visible_pages']) || ($config['enabled'] && !$config['visible_pages'])) throw new AdminException('请选择有效的导航展示页面');
        foreach ($config['visible_pages'] as $page) if (!is_string($page) || !in_array($page, self::PAGES, true)) throw new AdminException('请选择有效的导航展示页面');
        $config['visible_pages'] = array_values(array_unique($config['visible_pages']));
        if (!is_array($config['menus']) || count($config['menus']) < 1 || count($config['menus']) > 5) throw new AdminException('主导航需配置1至5个菜单');
        $menus = []; $links = [];
        foreach ($config['menus'] as $item) {
            if (!is_array($item)) throw new AdminException('菜单配置格式不正确');
            $menu = [];
            foreach (['name', 'link', 'icon', 'selected_icon'] as $key) {
                if (!isset($item[$key]) || !is_string($item[$key])) throw new AdminException('请填写菜单名称、图标与链接');
                $menu[$key] = trim($item[$key]);
            }
            if ($menu['name'] === '' || mb_strlen($menu['name']) > 8) throw new AdminException('菜单名称需为1至8个字');
            if (strlen($menu['link']) > 1000 || preg_match('/[\x00-\x20<>"\\\\]/', $menu['link']) || !preg_match('#^/pages/[a-zA-Z0-9_/-]+(?:\?[^\s]*)?$#D', $menu['link'])) throw new AdminException('菜单链接请选择商城内部页面');
            if (in_array($menu['link'], $links, true)) throw new AdminException('菜单跳转链接不能重复');
            $links[] = $menu['link'];
            foreach (['icon', 'selected_icon'] as $key) {
                if ($menu[$key] === '' && $config['display'] === 1) continue;
                // Some existing themes embed small PNG icons directly in their JSON.
                if (strlen($menu[$key]) <= 1024 * 1024 && preg_match('#^data:image/(?:png|jpeg|gif|webp|avif);base64,([A-Za-z0-9+/]+={0,2})$#D', $menu[$key], $embedded) && base64_decode($embedded[1], true) !== false) continue;
                if (strlen($menu[$key]) > 1000 || preg_match('/[\x00-\x20<>"\\\\]/', $menu[$key]) || !preg_match('#^(?:/(?!/)|https?://)[^\s]+$#D', $menu[$key])) throw new AdminException('请为菜单选择有效的选中和未选中图标');
            }
            $menus[] = $menu;
        }
        $config['menus'] = $menus;
        return $config;
    }

    public static function apply(array $home, $value): array
    {
        $config = self::validate($value);
        $nav = self::component($home);
        $nav = array_replace_recursive(self::baseComponent(), $nav);
        $nav['name'] = 'pageFoot';
        $nav['mainNavigation'] = ['title' => $config['name'], 'backgroundMode' => $config['background_mode'], 'corner' => $config['corner'], 'visiblePages' => $config['visible_pages']];
        $nav['isHide'] = !$config['enabled'];
        $nav['effectConfig']['tabVal'] = $config['enabled'];
        $nav['toneConfig']['tabVal'] = $config['text_mode'] === 'custom' ? 1 : 0;
        $nav['navStyleConfig']['tabVal'] = $config['display'];
        foreach (['bgColor' => 'background_color', 'bgColor2' => 'background_color', 'txtColor' => 'text_color', 'activeTxtColor' => 'selected_color'] as $key => $field) $nav[$key]['color'] = [['item' => $config[$field]]];
        $nav['menuList'] = array_map(function ($item) {
            return ['name' => $item['name'], 'link' => $item['link'], 'imgList' => [$item['selected_icon'], $item['icon']]];
        }, $config['menus']);
        $items = $home['value'] ?? [];
        $found = false;
        foreach ($items as $key => $item) {
            if (!in_array(strtolower($item['name'] ?? ''), ['pagefoot', 'mainnavigation'], true)) continue;
            if ($found) unset($items[$key]);
            else { $items[$key] = $nav; $found = true; }
        }
        if (!$found) $items['mainNavigation'] = $nav;
        $home['value'] = $items;
        return $home;
    }

    public static function validateComponent(array $component): array
    {
        if (isset($component['scrollMode']) && !in_array($component['scrollMode'], ['always', 'smart'], true)) throw new AdminException('导航显示方式不正确');
        $config = self::validate(self::read(['value' => [$component]]));
        $menus = array_map(function ($menu) { return ['name' => $menu['name'], 'link' => $menu['link'], 'imgList' => [$menu['selected_icon'], $menu['icon']]]; }, $config['menus']);
        $component['menuList'] = $menus;
        $component['mainNavigation']['pageScoped'] = true;
        foreach (ComponentStyleConfig::KEYS as $key) if (isset($component[$key])) ComponentStyleConfig::validate([$key => $component[$key]]);
        return $component;
    }

    public static function validatePage(array $page): array
    {
        $count = 0;
        foreach (($page['value'] ?? []) as $key => $component) {
            if (!is_array($component) || !in_array(strtolower($component['name'] ?? ''), ['pagefoot', 'mainnavigation'], true)) continue;
            if (++$count > 1) throw new AdminException('每个页面只能添加一个导航栏');
            $page['value'][$key] = self::validateComponent($component);
        }
        return $page;
    }

    private static function baseComponent(): array
    {
        $radio = function ($title, $labels, $value = 0) { return ['title' => $title, 'tabVal' => $value, 'tabList' => array_map(function ($name) { return ['name' => $name]; }, $labels)]; };
        $nav = ['name' => 'pageFoot', 'cname' => '底部导航', 'setUp' => ['tabVal' => 0], 'titleLeft' => '展示设置', 'titleNav' => '导航内容', 'titleRight' => '颜色设置', 'titleCurrency' => '通用样式',
            'status' => ['title' => '是否自定义', 'name' => 'status', 'status' => false],
            'effectConfig' => $radio('展示效果', ['系统默认', '自定义'], 1), 'navConfig' => $radio('导航类型', ['底部固定', '底部悬浮']),
            'navStyleConfig' => $radio('导航样式', ['图片+文字', '文字', '图片']), 'toneConfig' => $radio('色调', ['跟随主题风格', '自定义']),
            'fillet' => ['title' => '背景圆角', 'type' => 0, 'val' => 0, 'min' => 0, 'valName' => '圆角值', 'list' => [['val' => '全部', 'icon' => 'iconcaozuo-zhengti'], ['val' => '单个', 'icon' => 'iconcaozuo-bianjiao']], 'valList' => [['val' => 0], ['val' => 0], ['val' => 0], ['val' => 0]]]];
        foreach (['topConfig' => '上边距', 'bottomConfig' => '下边距', 'prConfig' => '左右边距', 'mbConfig' => '页面下间距'] as $key => $title) $nav[$key] = ['title' => $title, 'val' => 0, 'min' => 0];
        foreach (['bgColor' => '背景颜色', 'bgColor2' => '背景颜色', 'txtColor' => '文字颜色', 'activeTxtColor' => '选中文字颜色'] as $key => $title) $nav[$key] = ['title' => $title, 'name' => $key, 'default' => [['item' => '#FFFFFF']], 'color' => [['item' => '#FFFFFF']]];
        return $nav;
    }
}
