<?php
declare(strict_types=1);

namespace app\services\order;

/**
 * The server-owned explanation of a quote/order. Values are decimal strings;
 * clients render these rows and never infer a discount from a displayed price.
 */
class PriceExplanationServices
{
    private static function add(string $left, $right): string
    {
        return bcadd($left, (string)$right, 2);
    }

    private static function negative(string $kind, string $label, string $amount, string $sourceId = ''): ?array
    {
        if (bccomp($amount, '0.00', 2) <= 0) return null;
        return ['kind' => $kind, 'label' => $label, 'amount' => '-' . $amount, 'source_id' => $sourceId, 'applied' => true];
    }

    /** Build a stable, auditable explanation from the same quote/cart data used to charge. */
    public static function quote(array $cartInfo, array $priceData): array
    {
        $rows = [];
        $goods = '0.00';
        $member = '0.00';
        foreach ($cartInfo as $cart) {
            $qty = max(0, (int)($cart['cart_num'] ?? 0));
            $base = bcmul((string)($cart['sum_price'] ?? $cart['truePrice'] ?? '0'), (string)$qty, 2);
            $goods = self::add($goods, $base);
            $discount = bcmul((string)($cart['vip_truePrice'] ?? '0'), (string)$qty, 2);
            $member = self::add($member, $discount);
        }
        if (bccomp($goods, '0.00', 2) > 0) $rows[] = ['kind' => 'sku_price', 'label' => '规格售价', 'amount' => $goods, 'source_id' => 'cart', 'applied' => true];
        if ($row = self::negative('member_price', '会员价格优惠', $member, 'member')) $rows[] = $row;
        $activities = (array)($priceData['full_reduction_activities'] ?? []);
        if ($activities) {
            foreach ($activities as $activity) {
                $amount = (string)($activity['discount'] ?? '0.00');
                if ($row = self::negative('full_reduction', (string)($activity['name'] ?? '满减优惠'), $amount, 'full_reduction:' . (int)($activity['id'] ?? 0))) $rows[] = $row;
            }
        } elseif ($row = self::negative('full_reduction', '满减优惠', (string)($priceData['full_reduction_price'] ?? '0.00'), 'full_reduction')) {
            $rows[] = $row;
        }
        if ($row = self::negative('coupon', '优惠券抵扣', (string)($priceData['coupon_price'] ?? '0.00'), 'coupon:' . (int)($priceData['coupon_id'] ?? 0))) $rows[] = $row;
        if ($row = self::negative('integral', '积分抵扣', (string)($priceData['deduction_price'] ?? '0.00'), 'integral')) $rows[] = $row;
        $postage = (string)($priceData['pay_postage'] ?? '0.00');
        if (bccomp($postage, '0.00', 2) > 0) $rows[] = ['kind' => 'postage', 'label' => '配送运费', 'amount' => $postage, 'source_id' => 'shipping', 'applied' => true];
        $gift = (string)($priceData['gift_price'] ?? '0.00');
        if (bccomp($gift, '0.00', 2) > 0) $rows[] = ['kind' => 'gift', 'label' => '礼品附加费用', 'amount' => $gift, 'source_id' => 'gift', 'applied' => true];
        $payable = number_format((float)($priceData['pay_price'] ?? 0), 2, '.', '');
        $trace = hash('sha256', json_encode([$rows, $payable], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
        return ['currency' => 'CNY', 'goods_amount' => $goods, 'line_items' => $rows,
            'payable_amount' => $payable, 'calculated_at' => time(), 'pricing_version' => 'quote-v1', 'trace_id' => $trace];
    }

    /** Attach the final line allocations to the immutable order cart snapshot. */
    public static function attachToCart(array $cartInfo, array $priceData): array
    {
        $first=true;$gift=(string)($priceData['gift_price']??'0.00');
        foreach ($cartInfo as &$cart) {
            $cart['price_explanation'] = self::line($cart, $priceData);
            if($first&&bccomp($gift,'0.00',2)>0){$cart['price_explanation']['line_items'][]=['kind'=>'gift','label'=>'礼品附加费用','amount'=>$gift,'source_id'=>'gift','applied'=>true];$cart['price_explanation']['payable_amount']=bcadd((string)$cart['price_explanation']['payable_amount'],$gift,2);}
            $first=false;
        }
        unset($cart);
        return $cartInfo;
    }

    /** A compact line snapshot survives partial shipment and order splitting. */
    private static function line(array $cart, array $priceData): array
    {
        $qty=max(0,(int)($cart['cart_num']??0));
        $goods=bcmul((string)($cart['sum_price']??$cart['full_reduction_base_price']??$cart['truePrice']??'0'),(string)$qty,2);
        $rows=[['kind'=>'sku_price','label'=>'规格售价','amount'=>$goods,'source_id'=>'cart:'.(string)($cart['id']??0),'applied'=>true]];
        $member=bcmul((string)($cart['vip_truePrice']??'0'),(string)$qty,2);
        if($row=self::negative('member_price','会员价格优惠',$member,'member'))$rows[]=$row;
        $reduction=(string)($cart['full_reduction_price']??'0.00');
        if($row=self::negative('full_reduction',(string)($cart['full_reduction_activity']['name']??'满减优惠'),$reduction,'full_reduction:'.(int)($cart['full_reduction_activity']['id']??0)))$rows[]=$row;
        if($row=self::negative('coupon','优惠券抵扣',(string)($cart['coupon_price']??'0.00'),'coupon:'.(int)($cart['coupon_id']??0)))$rows[]=$row;
        if($row=self::negative('integral','积分抵扣',(string)($cart['integral_price']??'0.00'),'integral'))$rows[]=$row;
        $postage=(string)($cart['postage_price']??'0.00');if(bccomp($postage,'0.00',2)>0)$rows[]=['kind'=>'postage','label'=>'配送运费','amount'=>$postage,'source_id'=>'shipping','applied'=>true];
        $payable=bcadd((string)($cart['sum_true_price']??'0.00'),$postage,2);
        $trace=hash('sha256',json_encode([$rows,$payable],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR));
        return ['currency'=>'CNY','goods_amount'=>$goods,'line_items'=>$rows,'payable_amount'=>$payable,'calculated_at'=>time(),'pricing_version'=>'line-v1','trace_id'=>$trace];
    }
}
