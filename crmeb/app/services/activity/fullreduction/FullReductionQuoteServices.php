<?php
namespace app\services\activity\fullreduction;

use think\facade\Db;

class FullReductionQuoteServices
{
    public function __construct()
    {
        FullReductionInstaller::ensureSchema();
    }

    public function quote(int $uid, array $cartInfo): array
    {
        $now = time();
        $user = Db::name('user')->where('uid', $uid)->where('is_del', 0)->where('status', 1)->field('uid,level')->find();
        $activities = $user ? Db::name('store_full_reduction')->where('is_del', 0)->where('status', 1)->where('start_time', '<=', $now)->where('end_time', '>', $now)->select()->toArray() : [];
        if ($activities) {
            $user['label_ids'] = array_map('intval', Db::name('user_label_relation')->where('uid', $uid)->whereIn('label_id', function ($query) { $query->name('user_label')->field('id'); })->column('label_id'));
            $levels = Db::name('system_user_level')->where('is_del', 0)->where('is_show', 1)->column('id');
            if (!in_array($user['level'], $levels)) $user['level'] = 0;
            foreach ($activities as &$activity) foreach (['rules', 'product_ids', 'level_ids', 'member_ids'] as $field) $activity[$field] = json_decode($activity[$field], true) ?: [];
            unset($activity);
            // Do not trust cached product eligibility when an activity or product changes after confirmation.
            $eligible = Db::name('store_product')->whereIn('id', array_column($cartInfo, 'product_id'))->where('is_del', 0)->where('is_show', 1)->where('presale', 0)->column('id');
            foreach ($cartInfo as &$cart) if (!in_array($cart['product_id'], $eligible)) $cart['is_valid'] = 0;
            unset($cart);
        }
        return FullReductionCalculator::quote($cartInfo, $activities, $user ?: [], $now);
    }
}
