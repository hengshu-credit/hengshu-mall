<?php
namespace app\services\diy;

use crmeb\exceptions\AdminException;

class ThemePaletteConfig
{
    public static function validate($value): array
    {
        if (!is_array($value)) throw new AdminException('配色配置格式不正确');
        $result = [];
        foreach (['theme_color' => '主题颜色', 'gradient_color' => '渐变颜色', 'sub_color' => '辅助颜色'] as $key => $label) {
            $color = $value[$key] ?? '';
            if (!is_string($color) || !preg_match('/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/iD', $color)) throw new AdminException($label . '请输入有效的 HEX 色值');
            if (strlen($color) === 4) $color = '#' . $color[1] . $color[1] . $color[2] . $color[2] . $color[3] . $color[3];
            $result[$key] = strtoupper($color);
        }
        $color = $result['theme_color'];
        $result['light_color'] = sprintf('rgba(%d, %d, %d, 0.1)', hexdec(substr($color, 1, 2)), hexdec(substr($color, 3, 2)), hexdec(substr($color, 5, 2)));
        $mode = $value['palette_mode'] ?? 'custom';
        if (!in_array($mode, ['preset', 'custom'], true)) throw new AdminException('请选择预设配色或自定义配色');
        $id = $value['palette_id'] ?? '';
        if (!is_string($id) || !preg_match('/^[a-z0-9-]{0,40}$/D', $id)) throw new AdminException('配色方案标识不正确');
        $result['palette_mode'] = $mode;
        $result['palette_id'] = $mode === 'preset' ? $id : '';
        return $result;
    }
}
