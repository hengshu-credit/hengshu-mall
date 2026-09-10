<?php
namespace app\services\activity\fullreduction;

use crmeb\exceptions\AdminException;

/** Validation shared by creation, editing and re-enabling an activity. */
class FullReductionConfig
{
    public static function ids($values): array
    {
        if (!is_array($values) || count($values) > 1000) throw new AdminException('选择项必须为数组，且不能超过1000项');
        $ids = [];
        foreach ($values as $value) {
            if ((!is_int($value) && !is_string($value)) || !preg_match('/^[1-9][0-9]{0,9}$/D', (string)$value) || $value > 2147483647) {
                throw new AdminException('选择项ID不正确');
            }
            $ids[] = (int)$value;
        }
        return array_values(array_unique($ids));
    }

    private static function integer($value, int $min, int $max, string $label): int
    {
        if ((!is_int($value) && !is_string($value)) || filter_var($value, FILTER_VALIDATE_INT) === false || $value < $min || $value > $max) {
            throw new AdminException($label . '不正确');
        }
        return (int)$value;
    }

    private static function decimal($value, string $label): string
    {
        if ((!is_string($value) && !is_int($value) && !is_float($value)) || !preg_match('/^\d{1,5}(?:\.\d{1,2})?$/D', (string)$value) || $value <= 0 || $value > 99999) {
            throw new AdminException($label . '需为0.01至99999，最多保留两位小数');
        }
        return number_format((float)$value, 2, '.', '');
    }

    private static function timestamp($value): int
    {
        if (is_int($value) && $value > 0 && $value <= 4102444800) return $value;
        if (!is_string($value)) throw new AdminException('请选择完整的活动起止时间');
        $date = \DateTimeImmutable::createFromFormat('!Y-m-d H:i:s', $value);
        if (!$date || $date->format('Y-m-d H:i:s') !== $value || $date->getTimestamp() <= 0 || $date->getTimestamp() > 4102444800) {
            throw new AdminException('活动时间格式不正确');
        }
        return $date->getTimestamp();
    }

    public static function normalize(array $input): array
    {
        $data = [];
        if (!is_string($input['name'] ?? null)) throw new AdminException('请输入活动名称');
        $data['name'] = trim($input['name']);
        if ($data['name'] === '' || mb_strlen($data['name']) > 60) throw new AdminException('活动名称需为1至60个字符');
        $data['start_time'] = self::timestamp($input['start_time'] ?? null);
        $data['end_time'] = self::timestamp($input['end_time'] ?? null);
        if ($data['end_time'] <= $data['start_time']) throw new AdminException('截止时间必须晚于起始时间');
        foreach (['unit' => [1, 2], 'rules_type' => [0, 1], 'discount_type' => [1, 2], 'status' => [0, 1], 'sort' => [0, 999999]] as $key => $bounds) {
            $data[$key] = self::integer($input[$key] ?? null, $bounds[0], $bounds[1], $key);
        }
        if (!$data['rules_type'] && $data['discount_type'] !== 1) throw new AdminException('循环优惠仅支持减价');
        $rules = $input['rules'] ?? null;
        if (!is_array($rules) || !$rules || count($rules) > 5 || (!$data['rules_type'] && count($rules) !== 1)) {
            throw new AdminException('阶梯优惠需设置1至5级，循环优惠仅支持1级');
        }
        $data['rules'] = [];
        $previous = 0;
        foreach ($rules as $index => $rule) {
            if (!is_array($rule)) throw new AdminException('优惠规则不正确');
            $threshold = $data['unit'] === 2
                ? (string)self::integer($rule['threshold'] ?? null, 1, 99999, '件数门槛')
                : self::decimal($rule['threshold'] ?? null, '金额门槛');
            $discount = self::decimal($rule['discount'] ?? null, '优惠数值');
            if ((float)$threshold <= $previous) throw new AdminException('各级门槛须从小到大且不能重复');
            if ($data['discount_type'] === 2 && ((float)$discount < 0.1 || (float)$discount > 9.9)) throw new AdminException('折扣范围为0.1至9.9折');
            if ($data['discount_type'] === 1 && $data['unit'] === 1 && (float)$discount >= (float)$threshold) throw new AdminException('减免金额必须小于门槛金额');
            $data['rules'][] = ['threshold' => $threshold, 'discount' => $discount];
            $previous = (float)$threshold;
        }
        $data['range_type'] = self::integer($input['range_type'] ?? null, 0, 4, '适用商品范围');
        if (!in_array($data['range_type'], [0, 3, 4], true)) throw new AdminException('适用商品范围不正确');
        $data['product_ids'] = $data['range_type'] ? self::ids($input['product_ids'] ?? []) : [];
        if ($data['range_type'] && !$data['product_ids']) throw new AdminException('请至少选择一个商品');
        $data['level_ids'] = self::ids($input['level_ids'] ?? []);
        $data['member_type'] = $input['member_type'] ?? 'all';
        if (!in_array($data['member_type'], ['all', 'user', 'tag', 'level'], true)) throw new AdminException('适用会员范围不正确');
        $data['member_ids'] = $data['member_type'] === 'all' ? [] : self::ids($input['member_ids'] ?? []);
        if ($data['member_type'] !== 'all' && !$data['member_ids']) throw new AdminException('请选择适用会员');
        $data['tag_match'] = $input['tag_match'] ?? 'any';
        if (!in_array($data['tag_match'], ['any', 'all'], true)) throw new AdminException('标签匹配方式不正确');
        if ($data['member_type'] !== 'tag') $data['tag_match'] = 'any';
        return $data;
    }

    public static function activityState(array $data, int $now): string
    {
        if (!$data['status']) return 'disabled';
        if ($data['end_time'] <= $now) return 'ended';
        return $data['start_time'] > $now ? 'pending' : 'running';
    }

    /** Open-ended scopes also include future products, so do not infer overlap from today's catalog. */
    public static function scopesOverlap(array $a, array $b): bool
    {
        if ((int)$a['range_type'] !== 3 && (int)$b['range_type'] !== 3) return true;
        if ((int)$a['range_type'] !== 3) return self::scopesOverlap($b, $a);
        if ((int)$b['range_type'] === 3) return (bool)array_intersect($a['product_ids'], $b['product_ids']);
        if ((int)$b['range_type'] === 4) return (bool)array_diff($a['product_ids'], $b['product_ids']);
        return (bool)$a['product_ids'];
    }
}
