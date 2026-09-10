<?php
declare(strict_types=1);
namespace app\services\activity\style;

use crmeb\exceptions\AdminException;

class MarketingStyleConfig
{
    public static function ids($values): array
    {
        if (!is_array($values) || count($values) > 1000) throw new AdminException('使用范围最多选择1000项');
        $ids = [];
        foreach ($values as $value) {
            if ((!is_int($value) && !is_string($value)) || !preg_match('/^[1-9][0-9]*$/D', (string)$value) || (float)$value > 2147483647) throw new AdminException('使用范围编号不正确');
            $ids[] = (int)$value;
        }
        return array_values(array_unique($ids));
    }

    private static function image($value, bool $required): string
    {
        if (!is_string($value)) throw new AdminException('请选择有效的图片素材');
        $value = trim($value);
        if (!$required && $value === '') return '';
        if ($value === '' || strlen($value) > 1000 || preg_match('/[\x00-\x20<>"\\\\]/', $value) || !preg_match('#^(?:/(?!/)|https?://)[^\s]+$#D', $value)) throw new AdminException('请选择有效的图片素材');
        return $value;
    }

    public static function validate(array $data): array
    {
        $name = $data['name'] ?? '';
        if (!is_string($name) || trim($name) === '' || mb_strlen(trim($name)) > 60) throw new AdminException('活动名称需为1至60个字');
        $kind = $data['kind'] ?? '';
        if (!in_array($kind, ['border', 'atmosphere'], true)) throw new AdminException('营销样式类型不正确');
        $times = [];
        foreach (['start_time', 'end_time'] as $key) {
            $time = $data[$key] ?? null;
            if ((!is_int($time) && !is_string($time)) || !preg_match('/^[0-9]+$/D', (string)$time) || $time < 1 || $time > 4102444800) throw new AdminException('请选择有效的活动起止时间');
            $times[$key] = (int)$time;
        }
        if ($times['end_time'] <= $times['start_time']) throw new AdminException('结束时间必须晚于开始时间');
        $enabled = $data['enabled'] ?? 0;
        if (!in_array($enabled, [0, 1, '0', '1', true, false], true)) throw new AdminException('启用状态不正确');
        $priority = $data['priority'] ?? 0;
        if ((!is_int($priority) && !is_string($priority)) || !preg_match('/^[0-9]+$/D', (string)$priority) || $priority > 9999) throw new AdminException('优先级需为0至9999的整数');
        $scope = $data['scope_type'] ?? 'all';
        if (!in_array($scope, ['all', 'products', 'categories', 'brands', 'labels'], true)) throw new AdminException('使用范围不正确');
        $ids = $scope === 'all' ? [] : self::ids($data['scope_ids'] ?? []);
        if ($scope !== 'all' && !$ids) throw new AdminException('请至少选择一项使用范围');
        return ['name'=>trim($name), 'kind'=>$kind, 'mobile_image'=>self::image($data['mobile_image'] ?? '', true),
            'pc_image'=>$kind === 'atmosphere' ? self::image($data['pc_image'] ?? '', false) : '',
            'enabled'=>(int)(bool)$enabled, 'priority'=>(int)$priority, 'scope_type'=>$scope, 'scope_ids'=>$ids] + $times;
    }

    public static function status(array $row, int $now): string
    {
        if (empty($row['enabled'])) return 'disabled';
        if ($now < (int)$row['start_time']) return 'upcoming';
        return $now >= (int)$row['end_time'] ? 'ended' : 'running';
    }

    public static function matches(array $rule, array $product): bool
    {
        if ($rule['scope_type'] === 'all') return true;
        $key = ['products'=>'ids', 'categories'=>'category_ids', 'brands'=>'brand_ids', 'labels'=>'label_ids'][$rule['scope_type']] ?? '';
        return $key !== '' && (bool)array_intersect($rule['scope_ids'], $product[$key] ?? []);
    }

    public static function choose(array $rules, array $product, int $now): array
    {
        usort($rules, function ($a, $b) { return ((int)$b['priority'] <=> (int)$a['priority']) ?: ((int)$b['id'] <=> (int)$a['id']); });
        $result = [];
        foreach ($rules as $rule) {
            if (isset($result[$rule['kind']]) || self::status($rule, $now) !== 'running' || !self::matches($rule, $product)) continue;
            $result[$rule['kind']] = array_intersect_key($rule, array_flip(['id','name','kind','mobile_image','pc_image','start_time','end_time']));
        }
        return $result;
    }
}
