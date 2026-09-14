<?php
require __DIR__.'/commerce_bootstrap.php';
use think\facade\Db;
class CancellationEffects extends app\services\order\StoreOrderRefundServices {
    public function __construct() {}
    public function integralAndCouponBack($order, $type = 'refund') {return true;}
    public function regressionStock($order) {Db::name('store_product')->where('id',1)->inc('stock')->update();return true;}
}
app()->instance(app\services\order\StoreOrderRefundServices::class,new CancellationEffects);
if(($argv[1]??'')==='worker'){
    try{
        switch($argv[2]){
            case 'stock': (new app\dao\product\product\StoreProductDao)->decStockIncSales(['id'=>1],1);break;
            case 'integral':
                app()->make(app\services\order\StoreOrderCreateServices::class)->transaction(function(){
                    app()->make(app\services\order\StoreOrderCreateServices::class)->deductIntegral(['uid'=>101,'integral'=>100],true,['SurplusIntegral'=>0,'usedIntegral'=>100,'deduction_price'=>'1.00'],101,random_int(10,10000));
                });break;
            case 'cancel':app()->make(app\services\order\StoreOrderServices::class)->cancelOrder('race-order',101);break;
            case 'pay':app()->make(app\services\pay\YuePayServices::class)->yueOrderPay(Db::name('store_order')->where('id',1)->find(),101);break;
        }
    }catch(crmeb\exceptions\ApiException $expected){echo 'rejected';}
    exit;
}
hardeningSchema();hardeningReset();
Db::name('store_product')->where('1=1')->delete();Db::name('store_product')->insert(['id'=>1,'store_name'=>'last item','stock'=>1,'sales'=>0]);
parallelCommerce(array_fill(0,30,['stock']),basename(__FILE__));
checkCommerce(Db::name('store_product')->where('id',1)->value('stock')===0&&Db::name('store_product')->where('id',1)->value('sales')===1,'last item permits exactly one concurrent stock decrement');
parallelCommerce(array_fill(0,6,['integral']),basename(__FILE__));
checkCommerce((int)Db::name('user')->where('uid',101)->value('integral')===0&&Db::name('user_bill')->where('type','deduction')->count()===1,'different checkouts cannot spend one integral balance twice');
function cancellationFixture(){
    hardeningReset();Db::name('store_order')->where('1=1')->delete();Db::name('store_order_status')->where('1=1')->delete();
    Db::name('store_product')->where('id',1)->update(['stock'=>0]);
    Db::name('user')->where('uid',101)->update(['now_money'=>'100.00']);
    Db::name('store_order')->insert(['id'=>1,'uid'=>101,'order_id'=>'race-order','unique'=>'race-key','pay_price'=>'20.00','paid'=>0,'is_cancel'=>0,'cart_id'=>'[]','pay_uid'=>101]);
}
cancellationFixture();parallelCommerce([['cancel'],['cancel'],['cancel']],basename(__FILE__));
checkCommerce(Db::name('store_product')->where('id',1)->value('stock')===1,'duplicate cancellation releases reserved stock once');
cancellationFixture();parallelCommerce([['cancel'],['pay']],basename(__FILE__));
$order=Db::name('store_order')->where('id',1)->find();$stock=Db::name('store_product')->where('id',1)->value('stock');
checkCommerce(($order['paid']&&!$order['is_cancel']&&$stock===0&&moneyValue()==='80.00')||(!$order['paid']&&$order['is_cancel']&&$stock===1&&moneyValue()==='100.00'),'cancel versus balance payment yields one coherent outcome');
cancellationFixture();app()->make(app\services\order\StoreOrderServices::class)->cancelOrder('race-order',101);
$result=app()->make(app\services\pay\PayNotifyServices::class)->wechatProduct('race-order','late-provider-payment','weixin');
$order=Db::name('store_order')->where('id',1)->find();
checkCommerce($result&&$order['paid']&&$order['is_cancel']&&$order['refund_status']===1&&Db::name('store_product')->where('id',1)->value('stock')===1,'late external payment is recorded for refund without reclaiming released stock');
checkCommerce(Db::name('commerce_task')->where('step','late_payment_review')->count()===1,'late payment has a durable manual review task');
echo "Stock/integral/cancellation race checks passed.\n";
