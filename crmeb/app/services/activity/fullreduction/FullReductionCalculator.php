<?php
namespace app\services\activity\fullreduction;

use crmeb\exceptions\ApiException;

/** All discount calculations and allocations use integer cents, never floating point. */
class FullReductionCalculator
{
    public static function cents($amount): int
    {
        $amount = (string)$amount;
        if (!preg_match('/^\d{1,13}(?:\.\d{1,2})?$/D', $amount)) throw new ApiException('商品金额格式不正确');
        return (int)bcmul($amount, '100', 0);
    }

    public static function money(int $cents): string
    {
        return bcdiv((string)$cents, '100', 2);
    }

    /** Proportional allocation with deterministic largest remainders; sum is exact. */
    public static function allocate(int $amount, array $weights, bool $cap = true): array
    {
        $total = array_sum($weights);
        if ($amount < 0 || ($cap && $amount > $total)) throw new ApiException('优惠分摊金额超出商品金额');
        $allocated = array_fill_keys(array_keys($weights), 0);
        if (!$amount || !$total) return $allocated;
        $remainders = [];
        foreach ($weights as $key => $weight) {
            $numerator = bcmul((string)$amount, (string)$weight, 0);
            $allocated[$key] = (int)bcdiv($numerator, (string)$total, 0);
            $remainders[$key] = (int)bcmod($numerator, (string)$total);
        }
        arsort($remainders, SORT_NUMERIC);
        $left = $amount - array_sum($allocated);
        foreach ($remainders as $key => $_) {
            if (!$left) break;
            if (!$cap || $allocated[$key] < $weights[$key]) { $allocated[$key]++; $left--; }
        }
        return $allocated;
    }

    public static function eligibleMember(array $activity, array $user): bool
    {
        $level = (int)($user['level'] ?? 0);
        if ($activity['level_ids'] && !in_array($level, $activity['level_ids'])) return false;
        switch ($activity['member_type']) {
            case 'all': return true;
            case 'user': return in_array((int)($user['uid'] ?? 0), $activity['member_ids']);
            case 'level': return in_array($level, $activity['member_ids']);
            case 'tag':
                $matched = array_intersect($activity['member_ids'], $user['label_ids'] ?? []);
                return $activity['tag_match'] === 'all' ? count($matched) === count($activity['member_ids']) : (bool)$matched;
        }
        return false;
    }

    public static function quote(array $cartInfo, array $activities, array $user, int $now): array
    {
        $lines = $base = [];
        foreach ($cartInfo as $cart) {
            $id = (string)$cart['id'];
            if (isset($base[$id])) throw new ApiException('购物车商品重复');
            $qty = $cart['cart_num'];
            if (!ctype_digit((string)$qty) || $qty < 1 || $qty > 999999) throw new ApiException('商品数量不正确');
            $lineTotal = bcmul((string)self::cents($cart['truePrice']), (string)$qty, 0);
            if (bccomp($lineTotal, '999999999999', 0) > 0) throw new ApiException('订单商品金额超出支持范围');
            $base[$id] = (int)$lineTotal;
            if (array_sum($base) > 999999999999) throw new ApiException('订单总金额超出支持范围');
            $lines[$id] = ['full_reduction_price' => '0.00', 'full_reduction_activity' => null];
        }
        // Priority only resolves legacy/imported overlapping configurations; a line is never discounted twice.
        usort($activities, function ($a, $b) { return [(int)$a['sort'], (int)$a['id']] <=> [(int)$b['sort'], (int)$b['id']]; });
        $claimed = $applied = [];
        $discountTotal = 0;
        foreach ($activities as $activity) {
            if (!empty($activity['is_del']) || FullReductionConfig::activityState($activity, $now) !== 'running' || !self::eligibleMember($activity, $user)) continue;
            $weights = [];
            $quantity = 0;
            foreach ($cartInfo as $cart) {
                $id = (string)$cart['id'];
                $product = $cart['productInfo'] ?? [];
                if (isset($claimed[$id]) || !$base[$id] || !empty($product['presale']) || !empty($product['is_del']) || (isset($cart['is_valid']) && !$cart['is_valid'])) continue;
                if (!empty($cart['type']) || !empty($cart['seckill_id']) || !empty($cart['bargain_id']) || !empty($cart['combination_id']) || !empty($cart['advance_id'])) continue;
                $selected = in_array((int)$cart['product_id'], $activity['product_ids']);
                if ((int)$activity['range_type'] === 3 && !$selected || (int)$activity['range_type'] === 4 && $selected) continue;
                $weights[$id] = $base[$id];
                $quantity += (int)$cart['cart_num'];
            }
            if (!$weights) continue;
            $subtotal = array_sum($weights);
            $measure = (int)$activity['unit'] === 1 ? $subtotal : $quantity;
            $discount = 0;
            $chosenRule = null;
            foreach ($activity['rules'] as $rule) {
                $threshold = (int)$activity['unit'] === 1 ? self::cents($rule['threshold']) : (int)$rule['threshold'];
                if ($threshold <= 0 || $measure < $threshold) continue;
                if ((int)$activity['discount_type'] === 2) {
                    // 8.00折 => pay 800 / 1000. Round the final payable amount to a cent.
                    $pay = (int)bcdiv(bcadd(bcmul((string)$subtotal, (string)self::cents($rule['discount']), 0), '500', 0), '1000', 0);
                    $candidate = max(0, $subtotal - $pay);
                } else {
                    $cycles = $activity['rules_type'] ? 1 : intdiv($measure, $threshold);
                    $candidate = min($subtotal, (int)bcmul((string)self::cents($rule['discount']), (string)$cycles, 0));
                }
                if ($candidate > $discount) { $discount = $candidate; $chosenRule = $rule; }
            }
            if (!$discount) continue;
            $snapshot = ['id' => (int)$activity['id'], 'name' => $activity['name'], 'unit' => (int)$activity['unit'], 'rules_type' => (int)$activity['rules_type'], 'discount_type' => (int)$activity['discount_type'], 'rule' => $chosenRule];
            foreach (self::allocate($discount, $weights) as $id => $amount) {
                $lines[$id] = ['full_reduction_price' => self::money($amount), 'full_reduction_activity' => $snapshot];
                $claimed[$id] = true;
            }
            $applied[] = $snapshot + ['discount' => self::money($discount)];
            $discountTotal += $discount;
        }
        return ['total_price' => self::money(array_sum($base)), 'full_reduction_price' => self::money($discountTotal), 'pay_price' => self::money(array_sum($base) - $discountTotal), 'lines' => $lines, 'activities' => $applied];
    }

    public static function lineSubtotal(array $cart): string
    {
        return bcsub(bcmul((string)$cart['truePrice'], (string)$cart['cart_num'], 2), (string)($cart['full_reduction_price'] ?? '0'), 2);
    }

    /** Persist exact line totals before any order-created callbacks or refunds can read them. */
    public static function settle(array $cartInfo, array $priceData): array
    {
        $weights = [];
        foreach ($cartInfo as $cart) {
            $id = (string)$cart['id'];
            $base = self::cents(bcmul((string)$cart['truePrice'], (string)$cart['cart_num'], 2));
            $reduction = self::cents($priceData['full_reduction_cart'][$id]['full_reduction_price'] ?? '0');
            $coupon = self::cents($priceData['coupon_cart'][$id] ?? '0');
            if ($reduction + $coupon > $base) throw new ApiException('商品优惠超过应付金额');
            $weights[$id] = $base - $reduction - $coupon;
        }
        $integral = self::allocate(self::cents($priceData['deduction_price'] ?? '0'), $weights);
        $postageWeights = [];
        foreach ($cartInfo as $cart) $postageWeights[(string)$cart['id']] = self::cents($priceData['postage_cart'][(string)$cart['id']] ?? ($cart['postage_price'] ?? '0'));
        if (!array_sum($postageWeights)) foreach ($cartInfo as $cart) $postageWeights[(string)$cart['id']] = (int)$cart['cart_num'];
        $postage = self::allocate(self::cents($priceData['pay_postage'] ?? '0'), $postageWeights, false);
        // Points are indivisible; apportion by the same remaining amounts without monetary caps.
        $points = (int)($priceData['usedIntegral'] ?? 0);
        $remainingPoints = $points;
        $remainingWeight = array_sum($weights);
        foreach ($cartInfo as &$cart) {
            $id = (string)$cart['id'];
            $cart['full_reduction_base_price'] = (string)$cart['truePrice'];
            $cart['full_reduction_price'] = $priceData['full_reduction_cart'][$id]['full_reduction_price'] ?? '0.00';
            $cart['full_reduction_activity'] = $priceData['full_reduction_cart'][$id]['full_reduction_activity'] ?? null;
            $cart['coupon_price'] = $priceData['coupon_cart'][$id] ?? '0.00';
            $cart['coupon_id'] = self::cents($cart['coupon_price']) ? ($priceData['coupon_id'] ?? 0) : 0;
            $cart['integral_price'] = self::money($integral[$id]);
            $cart['postage_price'] = self::money($postage[$id]);
            $cart['use_integral'] = $remainingWeight ? (int)bcdiv(bcmul((string)$remainingPoints, (string)$weights[$id], 0), (string)$remainingWeight, 0) : 0;
            $remainingPoints -= $cart['use_integral'];
            $remainingWeight -= $weights[$id];
            $cart['sum_true_price'] = self::money($weights[$id] - $integral[$id]);
            // Display-only unit price. Refund/split calculations must use sum_true_price.
            $cart['truePrice'] = bcdiv($cart['sum_true_price'], (string)$cart['cart_num'], 2);
            $cart['full_reduction_settled'] = 1;
            foreach (['one_brokerage', 'two_brokerage', 'staff_brokerage', 'agent_brokerage', 'division_brokerage'] as $field) $cart[$field] = '0.00';
        }
        return $cartInfo;
    }
}
