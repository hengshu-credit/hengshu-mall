<?php
// Included by full_reduction.php after the isolated database has been initialized.
use app\services\activity\fullreduction\FullReductionCalculator as Calc;
use app\services\activity\fullreduction\FullReductionConfig as Config;
use app\services\activity\fullreduction\FullReductionQuoteServices as Quote;
use think\facade\Db;

function reductionLine($id, $product, $price, $qty = 1, array $extra = []) {
    return array_replace(['id' => $id, 'product_id' => $product, 'truePrice' => $price, 'cart_num' => $qty, 'type' => 0, 'is_valid' => 1,
        'seckill_id' => 0, 'bargain_id' => 0, 'combination_id' => 0, 'advance_id' => 0,
        'productInfo' => ['id' => $product, 'presale' => 0, 'is_del' => 0, 'cate_id' => '1', 'store_name' => '测试商品', 'give_integral' => 0, 'virtual_type' => 1, 'custom_form' => '[]'],
        'postage_price' => '0.00', 'sum_price' => $price, 'costPrice' => '0.00', 'vip_truePrice' => '0.00'], $extra);
}
$rule = Config::normalize(array_replace($valid, ['range_type' => 0, 'start_time' => time() - 100, 'end_time' => time() + 3600]));
$rule['id'] = 100;
$customer = ['uid' => 1, 'level' => 1, 'label_ids' => [1, 2]];
$quote = function (array $lines, array $changes = [], ?array $user = null) use ($rule, $customer) { return Calc::quote($lines, [array_replace($rule, $changes)], $user ?? $customer, time()); };
foreach ([['99.99', '0.00'], ['100.00', '10.00'], ['100.01', '10.00']] as [$price, $expected]) checkReduction('amount threshold ' . $price, $quote([reductionLine('a', 1, $price)])['full_reduction_price'] === $expected);
checkReduction('tiers choose greatest applicable discount', $quote([reductionLine('a', 1, '300')], ['rules' => [['threshold' => '100', 'discount' => '30'], ['threshold' => '200', 'discount' => '20']]])['full_reduction_price'] === '30.00');
checkReduction('cycle floors by full thresholds', $quote([reductionLine('a', 1, '299.99')], ['rules_type' => 0])['full_reduction_price'] === '20.00');
checkReduction('quantity adds across SKUs', $quote([reductionLine('a', 1, '5', 2), reductionLine('b', 2, '5')], ['unit' => 2, 'rules' => [['threshold' => '3', 'discount' => '6']]])['full_reduction_price'] === '6.00');
checkReduction('quantity reduction cannot make negative pay', $quote([reductionLine('a', 1, '0.01', 3)], ['unit' => 2, 'rules_type' => 0, 'rules' => [['threshold' => '1', 'discount' => '10']]])['pay_price'] === '0.00');
checkReduction('discount rounds payable amount once', $quote([reductionLine('a', 1, '1.01')], ['discount_type' => 2, 'rules' => [['threshold' => '1', 'discount' => '5']]])['pay_price'] === '0.51');
checkReduction('excluded items neither contribute nor receive discounts', $quote([reductionLine('a', 1, '60'), reductionLine('b', 2, '60')], ['range_type' => 4, 'product_ids' => [2]])['full_reduction_price'] === '0.00');
foreach (['seckill_id', 'bargain_id', 'combination_id', 'advance_id'] as $field) checkReduction('other activity excluded ' . $field, $quote([reductionLine('a', 1, '100', 1, [$field => 1])])['full_reduction_price'] === '0.00');
checkReduction('presale excluded', $quote([reductionLine('a', 1, '100', 1, ['productInfo' => ['presale' => 1]])])['full_reduction_price'] === '0.00');
foreach ([['member_type' => 'user', 'member_ids' => [2]], ['member_type' => 'level', 'member_ids' => [2]], ['level_ids' => [2]], ['member_type' => 'tag', 'member_ids' => [2, 3], 'tag_match' => 'all']] as $restriction) checkReduction('member restrictions ' . json_encode($restriction), $quote([reductionLine('a', 1, '100')], $restriction)['full_reduction_price'] === '0.00');
checkReduction('any tag matches', $quote([reductionLine('a', 1, '100')], ['member_type' => 'tag', 'member_ids' => [2, 3], 'tag_match' => 'any'])['full_reduction_price'] === '10.00');
foreach ([['start_time' => time() + 30], ['end_time' => time()], ['status' => 0], ['is_del' => 1]] as $inactive) checkReduction('inactive activity ignored ' . json_encode($inactive), $quote([reductionLine('a', 1, '100')], $inactive)['full_reduction_price'] === '0.00');
$both = Calc::quote([reductionLine('a', 1, '100')], [$rule, array_replace($rule, ['id' => 101])], $customer, time());
checkReduction('legacy overlap never double-discounts a line', $both['full_reduction_price'] === '10.00');
foreach ([[1, [1, 1, 1]], [100, [1, 100, 200]], [29999, [10000, 10000, 10000]], [0, [0, 0]], [1, [0, 1]], [123456, [999999999999, 123456789]]] as [$amount, $weights]) {
    $allocated = Calc::allocate($amount, $weights);
    checkReduction('allocation sums exactly ' . $amount, array_sum($allocated) === $amount);
    foreach ($allocated as $key => $part) checkReduction('allocation stays in line bounds', $part >= 0 && $part <= $weights[$key]);
}

// Product filters: parent categories, brand relations, tag IDs and combined conditions.
Db::name('store_category')->insertAll([['id' => 1, 'pid' => 0, 'cate_name' => '父分类'], ['id' => 2, 'pid' => 1, 'cate_name' => '子分类'], ['id' => 3, 'pid' => 2, 'cate_name' => '孙分类'], ['id' => 11, 'pid' => 0, 'cate_name' => '其他']]);
\app\services\product\product\ProductBrandInstaller::ensureSchema();
Db::name('store_product_brand')->insertAll([['id' => 1, 'name' => '品牌A'], ['id' => 2, 'name' => '品牌B']]);
Db::name('store_product_brand_relation')->insertAll([['product_id' => 1, 'brand_id' => 1], ['product_id' => 2, 'brand_id' => 2]]);
Db::name('store_product_label')->insertAll([['id' => 1, 'name' => '标签A'], ['id' => 11, 'name' => '标签B']]);
Db::name('store_product')->where('id', 1)->update(['cate_id' => '3', 'label_list' => '1,11']);
Db::name('store_product')->where('id', 2)->update(['cate_id' => '11', 'label_list' => '11']);
checkReduction('category filtering includes all descendant levels', array_column($service->options(['type' => 'product', 'category_id' => 1])['list'], 'id') === [1]);
checkReduction('brand filtering uses product relation', array_column($service->options(['type' => 'product', 'brand_id' => 2])['list'], 'id') === [2]);
checkReduction('tag ID does not partially match 11', array_column($service->options(['type' => 'product', 'label_id' => 1])['list'], 'id') === [1]);
checkReduction('combined filters intersect', $service->options(['type' => 'product', 'category_id' => 1, 'brand_id' => 2])['count'] === 0);
checkReduction('filter dictionaries load real label names', $service->options(['type' => 'product_filters'])['labels'][0]['name'] === '标签A');

// Actual quote service and computedOrder pipeline, with real coupon/points records.
Db::name('store_full_reduction')->where('id', '>', 0)->update(['status' => 0]);
$activityId = $service->saveActivity(0, array_replace($valid, ['start_time' => time() - 60, 'range_type' => 0, 'rules' => [['threshold' => '100', 'discount' => '30']]]));
Db::name('user')->where('uid', 1)->update(['integral' => 100, 'level' => 1]);
Db::name('user_label_relation')->insertAll([['uid' => 1, 'label_id' => 1], ['uid' => 1, 'label_id' => 2]]);
$lines = [reductionLine('a', 1, '33.33', 3), reductionLine('b', 2, '50.01')];
$total = '150.00';
$shippingLines = $lines;
$shippingLines[0]['postage_price'] = '5.00';
$group = ['cartInfo' => $lines, 'priceGroup' => ['totalPrice' => $total, 'giftPrice' => '0.00', 'storePostage' => '5.00', 'storePostageDiscount' => 0, 'storeFreePostage' => 1000, 'cartInfo' => $shippingLines], 'other' => ['integralRatio' => '0.01', 'offlinePostage' => 0], 'addr' => ['id' => 1]];
Db::name('store_coupon_issue')->insertAll([['id' => 1, 'type' => 0, 'product_id' => ''], ['id' => 2, 'type' => 2, 'product_id' => '1']]);
Db::name('store_coupon_user')->insertAll([
    ['id' => 1, 'cid' => 1, 'uid' => 1, 'coupon_title' => '通用券', 'coupon_price' => 10, 'use_min_price' => 100, 'start_time' => time() - 60, 'end_time' => time() + 3600, 'type' => 'get'],
    ['id' => 2, 'cid' => 1, 'uid' => 1, 'coupon_title' => '门槛券', 'coupon_price' => 10, 'use_min_price' => 140, 'start_time' => time() - 60, 'end_time' => time() + 3600, 'type' => 'get'],
    ['id' => 3, 'cid' => 2, 'uid' => 1, 'coupon_title' => '指定商品券', 'coupon_price' => 100, 'use_min_price' => 0, 'start_time' => time() - 60, 'end_time' => time() + 3600, 'type' => 'get'],
]);
$computed = $testApp->make(\app\services\order\StoreOrderComputedServices::class);
$user = ['uid' => 1, 'integral' => 100];
$price = $computed->computedOrder(1, $user, $group, 1, 'yue', true, 1);
checkReduction('full reduction then coupon then points then postage', $price['pay_price'] === '114.00' && $price['full_reduction_price'] === '30.00' && (float)$price['coupon_price'] === 10.0 && (float)$price['deduction_price'] === 1.0);
try { $computed->computedOrder(1, $user, $group, 1, 'yue', false, 2); throw new RuntimeException('coupon incorrectly eligible'); } catch (\crmeb\exceptions\ApiException $error) { checkReduction('coupon threshold uses amount after full reduction', true); }
$scoped = $computed->computedOrder(1, $user, $group, 1, 'yue', false, 3);
checkReduction('scoped coupon capped by remaining eligible amount', (float)$scoped['coupon_price'] === 79.99 && $scoped['coupon_cart']['a'] === '79.99' && empty($scoped['coupon_cart']['b']));
$price['coupon_id'] = 1;
$settled = Calc::settle($lines, $price);
checkReduction('settled line payments plus postage exactly equal order', bcadd(array_reduce($settled, function ($sum, $line) { return bcadd($sum, $line['sum_true_price'], 2); }, '0'), '5.00', 2) === $price['pay_price']);
checkReduction('full reduction allocated only once', array_reduce($settled, function ($sum, $line) { return bcadd($sum, $line['full_reduction_price'], 2); }, '0') === '30.00');
checkReduction('points, coupon and postage line sums match', array_sum(array_column($settled, 'use_integral')) === 100 && array_sum(array_column($settled, 'coupon_price')) == 10 && array_sum(array_column($settled, 'postage_price')) == 5);
$split = $testApp->make(\app\services\order\StoreOrderSplitServices::class);
$first = $split->slpitComputeOrderCart(1, $settled[0], 'new');
$rest = $split->slpitComputeOrderCart(2, $settled[0], 'other');
foreach (['sum_true_price', 'full_reduction_price', 'coupon_price', 'integral_price', 'postage_price'] as $field) checkReduction('partial split preserves exact ' . $field, bcadd((string)$first[$field], (string)$rest[$field], 2) === $settled[0][$field]);
$refund = $testApp->make(\app\services\order\StoreOrderRefundServices::class);
checkReduction('refund uses exact line total instead of rounded unit price', bccomp($refund->getOrderSumPrice([$first]), (string)$first['sum_true_price'], 2) === 0);
$service->setActivityStatus($activityId, 0);
checkReduction('cached order recalculates when promotion disabled', $computed->computedOrder(1, $user, $group, 1, 'yue', false, 0)['full_reduction_price'] === '0.00');
checkReduction('stored order discount is immutable after activity disabled', $settled[0]['full_reduction_activity']['id'] === $activityId && $settled[0]['full_reduction_price'] !== '0.00');

// Real order creation and database transaction, with external event delivery disabled.
function event($name, $data = []) { return []; }
class ReductionOrderCreateProbe extends \app\services\order\StoreOrderCreateServices {
    public $failStock = false;
    public $disableActivity = 0;
    private $sequence = 0;
    public function getNewOrderId(string $prefix = 'wx') { if ($this->disableActivity) Db::name('store_full_reduction')->where('id', $this->disableActivity)->update(['status' => 0]); return 'reduction_audit_' . ++$this->sequence; }
    public function decGoodsStock(array $cartInfo, int $combinationId, int $seckillId, int $bargainId, int $advanceId) {
        foreach ($cartInfo as $cart) Db::name('store_product')->where('id', $cart['product_id'])->dec('stock', $cart['cart_num'])->update();
        if ($this->failStock) throw new \crmeb\exceptions\ApiException('模拟库存失败');
    }
}
$service->setActivityStatus($activityId, 1);
Db::name('store_product')->whereIn('id', [1, 2])->update(['stock' => 100]);
Db::name('user')->where('uid', 1)->update(['real_name' => '测试会员']);
$orderService = $testApp->make(\app\services\order\StoreOrderServices::class);
$creator = $testApp->make(ReductionOrderCreateProbe::class);
$orderUser = Db::name('user')->where('uid', 1)->find();
// Use numeric cart IDs, as persisted order cart_id columns require integers.
$orderLines = [reductionLine(101, 1, '33.33', 3), reductionLine(102, 2, '50.01')];
$orderGroup = $group; $orderGroup['cartInfo'] = $orderLines;
$orderGroup['priceGroup']['costPrice'] = '0.00';
$orderGroup['priceGroup']['cartInfo'] = $orderLines;
\crmeb\services\CacheService::set('user_order_1reduction_order_create', $orderGroup, 600);
$created = $creator->createOrder(1, 'reduction_order_create', $orderUser, 1, 'yue', false, 1);
checkReduction('order creation stores full reduction and correct payable', $created['full_reduction_price'] === '30.00' && $created['pay_price'] === '115.00');
$storedLines = Db::name('store_order_cart_info')->where('oid', $created['id'])->column('cart_info');
$storedLines = array_map(function ($line) { return json_decode($line, true); }, $storedLines);
checkReduction('exact discounted line snapshots exist before callbacks', count($storedLines) === 2 && !empty($storedLines[0]['full_reduction_settled']) && array_sum(array_column($storedLines, 'sum_true_price')) == 110);
checkReduction('successful order consumes coupon', (int)Db::name('store_coupon_user')->where('id', 1)->value('status') === 1);
Db::name('store_coupon_user')->insert(['id' => 4, 'cid' => 1, 'uid' => 1, 'coupon_title' => '回滚券', 'coupon_price' => 10, 'use_min_price' => 100, 'start_time' => time() - 60, 'end_time' => time() + 3600, 'type' => 'get']);
$beforeOrders = Db::name('store_order')->count();
$beforeStock = Db::name('store_product')->where('id', 1)->value('stock');
$creator->failStock = true;
\crmeb\services\CacheService::set('user_order_1reduction_order_failure', $orderGroup, 600);
try { $creator->createOrder(1, 'reduction_order_failure', $orderUser, 1, 'yue', false, 4); throw new RuntimeException('expected stock failure'); }
catch (\crmeb\exceptions\ApiException $error) { checkReduction('stock failure propagated', $error->getMessage() === '模拟库存失败'); }
checkReduction('failed creation rolls back coupon, order and stock', (int)Db::name('store_coupon_user')->where('id', 4)->value('status') === 0 && Db::name('store_order')->count() === $beforeOrders && Db::name('store_product')->where('id', 1)->value('stock') === $beforeStock);
$creator->failStock = false;
$creator->disableActivity = $activityId;
\crmeb\services\CacheService::set('user_order_1reduction_order_drift', $orderGroup, 600);
try { $creator->createOrder(1, 'reduction_order_drift', $orderUser, 1, 'yue', false, 4); throw new RuntimeException('expected promotion drift'); }
catch (\crmeb\exceptions\ApiException $error) { checkReduction('activity change before commit rejects stale discount', $error->getMessage() === '满减活动已变化，请重新确认订单'); }
checkReduction('price drift does not consume coupon or create order', (int)Db::name('store_coupon_user')->where('id', 4)->value('status') === 0 && Db::name('store_order')->count() === $beforeOrders);
$open = ['range_type' => 0, 'product_ids' => []];
$exclude = ['range_type' => 4, 'product_ids' => [1, 2, 3, 4]];
checkReduction('two open scopes conflict even if all current products excluded', Config::scopesOverlap($open, $exclude));
checkReduction('explicit inclusion can be disjoint from exclusions', !Config::scopesOverlap(['range_type' => 3, 'product_ids' => [1]], $exclude));
Db::name('store_cart')->insertAll([
    ['id' => 900, 'uid' => 2, 'product_id' => 1, 'cart_num' => 1, 'is_pay' => 0, 'is_del' => 0, 'is_new' => 0],
    ['id' => 901, 'uid' => 1, 'product_id' => 1, 'cart_num' => 1, 'is_pay' => 1, 'is_del' => 0, 'is_new' => 0],
    ['id' => 902, 'uid' => 1, 'product_id' => 1, 'cart_num' => 1, 'is_pay' => 0, 'is_del' => 1, 'is_new' => 0],
]);
$carts = $testApp->make(\app\services\order\StoreCartServices::class);
foreach ([[900], [901], [902], ['1 OR 1=1']] as $ids) {
    try { $carts->quoteFullReduction(1, $ids); throw new RuntimeException('invalid carts accepted'); }
    catch (\crmeb\exceptions\ApiException $error) { checkReduction('cart quote rejects unowned, paid, deleted or malformed IDs', true); }
}
function get_thumb_water($data) { return $data; } // Presentation-only image helper.
$service->setActivityStatus($activityId, 1);
Db::name('store_product')->where('id', 1)->update(['price' => '33.33']);
Db::name('store_product')->where('id', 2)->update(['price' => '50.01']);
Db::name('store_product_attr_value')->insertAll([
    ['id' => 1, 'product_id' => 1, 'unique' => 'redsku01', 'price' => '33.33', 'stock' => 100, 'suk' => '默认'],
    ['id' => 2, 'product_id' => 2, 'unique' => 'redsku02', 'price' => '50.01', 'stock' => 100, 'suk' => '默认'],
]);
Db::name('store_cart')->insertAll([
    ['id' => 903, 'uid' => 1, 'product_id' => 1, 'product_attr_unique' => 'redsku01', 'cart_num' => 3],
    ['id' => 904, 'uid' => 1, 'product_id' => 2, 'product_attr_unique' => 'redsku02', 'cart_num' => 1],
]);
checkReduction('real cart quote reads authoritative SKU prices and quantities', $carts->quoteFullReduction(1, [903, 904])['pay_price'] === '120.00');
checkReduction('unchecked cart products do not contribute to threshold', $carts->quoteFullReduction(1, [903])['full_reduction_price'] === '0.00');
echo "Full reduction checkout regressions passed.\n";
