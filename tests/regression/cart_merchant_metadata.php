<?php
declare(strict_types=1);
namespace app\services {
    class BaseServices { public function getPageValue() { return [1, 20]; } }
}
namespace app\dao\order {
    class StoreCartDao {
        public $rows = [];
        public $where;
        public function getCartList($where, $page, $limit, $with) { $this->where = $where; return $this->rows; }
    }
}
namespace app\services\merchant {
    class MerchantProducts {
        public static $calls = [];
        public static function summaries(array $rows): array {
            self::$calls[] = $rows;
            return array_map(function ($product) {
                $product['merchant'] = ['id' => $product['seller_shop_id'], 'name' => 'Current shop'];
                $product['merchant_name'] = 'Current shop';
                return $product;
            }, $rows);
        }
    }
}
namespace {
    require __DIR__ . '/../../crmeb/app/services/order/StoreCartServices.php';
    class CartProbe extends \app\services\order\StoreCartServices {
        public function handleCartList(int $uid, array $cartList, array $addr = [], int $shipping_type = 1) { return [$cartList, $cartList, []]; }
    }
    function check($condition, $message) { if (!$condition) throw new \RuntimeException($message); }
    $dao = new \app\dao\order\StoreCartDao();
    $dao->rows = [
        ['id' => '101', 'product_id' => 1, 'cart_num' => 2, 'truePrice' => '12.30', 'productInfo' => ['id' => 1, 'seller_shop_id' => 8]],
        ['id' => '102', 'product_id' => 2, 'productInfo' => ['id' => 2, 'seller_shop_id' => 9]],
        ['id' => '103', 'product_id' => 3, 'productInfo' => null],
    ];
    $service = new CartProbe($dao);
    $result = $service->getUserCartList(77, 1);
    check($dao->where['uid'] === 77, 'Cart ownership scope must remain intact');
    check(count(\app\services\merchant\MerchantProducts::$calls) === 1, 'Shop summaries must be fetched in one batch');
    check(count(\app\services\merchant\MerchantProducts::$calls[0]) === 2, 'Deleted product relations must not be summarized');
    check($result['valid'][0]['merchant']['id'] === 8 && $result['valid'][1]['merchant']['id'] === 9, 'Shop identity must follow each product');
    check($result['valid'][0]['productInfo']['merchant_name'] === 'Current shop', 'Current shop names must reach the cart');
    check($result['valid'][0]['cart_num'] === 2 && $result['valid'][0]['truePrice'] === '12.30', 'Metadata must not change quantities or prices');
    check($result['valid'][2]['merchant'] === null, 'Missing products must remain representable');
    $invalid = $service->getUserCartList(77, 0);
    check(!$invalid['valid'] && count($invalid['invalid']) === 3, 'Invalid cart response shape must be preserved');
    $dao->rows = []; $calls = count(\app\services\merchant\MerchantProducts::$calls);
    check($service->getUserCartList(77, 1)['valid'] === [], 'Empty carts must remain empty');
    check(count(\app\services\merchant\MerchantProducts::$calls) === $calls, 'Empty carts must skip the shop lookup');
    echo "PASS cart merchant metadata: ownership, batch lookup, current names, invalid/missing products, unchanged prices and empty cart\n";
}
