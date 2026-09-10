<?php
declare(strict_types=1);
namespace app\services\diy;
use crmeb\exceptions\AdminException;

/** Validate the existing detail editor's declarative common-style controls. */
class ComponentStyleConfig
{
    const KEYS = ['titleCurrency', 'moduleColor', 'bottomBgColor', 'componentBgConfig', 'fillet', 'marginConfig', 'paddingConfig', 'borderConfig', 'shadowConfig'];
    public static function validate($value): array
    {
        if (!is_array($value)) throw new AdminException('组件样式格式不正确');
        $value = array_intersect_key($value, array_flip(self::KEYS));
        $count = 0;
        $walk = function ($node, $key = '', $depth = 0) use (&$walk, &$count) {
            if (++$count > 1500 || $depth > 8) throw new AdminException('组件样式数据过多');
            if (is_array($node)) { foreach ($node as $k => $v) $walk($v, (string)$k, $depth + 1); return; }
            if (!is_scalar($node) && $node !== null) throw new AdminException('组件样式格式不正确');
            if (is_string($node) && (strlen($node) > 1000 || preg_match('/[\x00-\x1F<>]/', $node))) throw new AdminException('组件样式内容不正确');
            if ($key === 'tabVal' && (!is_numeric($node) || $node < 0 || $node > 3)) throw new AdminException('组件样式选项不正确');
            if ($key === 'val' && is_numeric($node) && ($node < -100 || $node > 1000)) throw new AdminException('组件样式尺寸超出范围');
            if ($key === 'item' && is_string($node) && !preg_match('/^(?:transparent|#[0-9a-f]{3,8}|rgba?\([0-9.,\s]+\))$/iD', $node)) throw new AdminException('组件颜色格式不正确');
            if ($key === 'url' && $node !== '' && (!is_string($node) || preg_match('/[\s"\\\\]/', $node) || !preg_match('#^(?:/(?!/)|https?://)[^\s]+$#D', $node))) throw new AdminException('组件背景图片地址不正确');
        };
        $walk($value);
        return $value;
    }
}
