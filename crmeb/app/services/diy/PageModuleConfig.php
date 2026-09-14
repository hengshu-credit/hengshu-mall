<?php
declare(strict_types=1);
namespace app\services\diy;

use crmeb\exceptions\AdminException;

class PageModuleConfig
{
    public static function validate(array $value, string $page): array
    {
        $type = $page === 'category' ? 'search' : 'service';
        $core = $page === 'category' ? ['search', 'category'] : ['service', 'list'];
        $extras = $value['extra_modules'] ?? [];
        $order = $value['content_order'] ?? $core;
        if (!is_array($extras) || !is_array($order)) throw new AdminException('组件排序配置格式不正确');
        $modules = [];
        foreach ($extras as $item) {
            if (!is_array($item) || !is_string($item['id'] ?? null) || !preg_match('/^' . $type . '_\w{1,80}$/D', $item['id']) || !is_array($item['config'] ?? null) || in_array($item['id'], $core, true)) {
                throw new AdminException('组件标识重复或配置格式不正确');
            }
            if ($type === 'search') $config = PageActionsConfig::search($item['config']);
            else {
                $source = array_intersect_key($item['config'], array_flip(['service_labels', 'service_style', 'service_hidden']));
                $config = array_intersect_key(CartPageConfig::validate($source), array_flip(['service_labels', 'service_style', 'service_hidden']));
            }
            $core[] = $item['id'];
            $modules[] = ['id' => $item['id'], 'config' => $config];
        }
        $normalized = [];
        foreach ($order as $id) {
            if (!is_string($id) || !in_array($id, $core, true) || in_array($id, $normalized, true)) throw new AdminException('组件排序包含无效或重复组件');
            $normalized[] = $id;
        }
        return ['extra_modules' => $modules, 'content_order' => array_merge($normalized, array_values(array_diff($core, $normalized)))];
    }
}
