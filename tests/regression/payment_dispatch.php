<?php
/** Real MySQL visibility tests; publications use a separate database connection instead of Redis. */
require dirname(__DIR__, 2) . '/crmeb/vendor/autoload.php';
if (getenv('CRMEB_AUDIT_DATABASE') !== 'crmeb_audit') throw new RuntimeException('Requires disposable crmeb_audit database');
$config = ['default' => 'mysql', 'connections' => ['mysql' => [
    'type' => 'mysql', 'hostname' => '127.0.0.1', 'hostport' => 3306, 'database' => 'crmeb_audit',
    'username' => 'root', 'password' => 'audit-only-password', 'charset' => 'utf8mb4', 'prefix' => '',
]]];
$db = new think\DbManager; $db->setConfig($config);
$worker = new think\DbManager; $worker->setConfig($config);
think\Model::setDb($db);
think\Container::getInstance()->instance(think\DbManager::class, $db);
$service = new class extends app\services\BaseServices {};
$db->execute('CREATE TABLE IF NOT EXISTS audit_queue_visibility (id INT PRIMARY KEY, paid INT NOT NULL) ENGINE=InnoDB');
$db->table('audit_queue_visibility')->where('1=1')->delete();
$db->table('audit_queue_visibility')->insert(['id' => 1, 'paid' => 0]);
$checks = [];
function checkDispatch($name, $pass, $evidence = null) {
    global $checks; $checks[] = compact('name', 'pass', 'evidence');
    fwrite(STDERR, ($pass ? 'PASS ' : 'FAIL ') . $name . "\n");
}
function deferDispatch(callable $callback) {
    // Before the fix the payment listener publishes immediately.
    if (class_exists(crmeb\utils\AfterCommit::class)) crmeb\utils\AfterCommit::defer($callback);
    else $callback();
}
$seen = [];
$service->transaction(function () use ($service, $db, $worker, &$seen) {
    $db->table('audit_queue_visibility')->where('id', 1)->update(['paid' => 1]);
    $service->transaction(function () use ($worker, &$seen) {
        deferDispatch(function () use ($worker, &$seen) { $seen[] = (int)$worker->table('audit_queue_visibility')->where('id', 1)->value('paid'); });
    });
    checkDispatch('inner transaction does not publish', $seen === [], $seen);
});
checkDispatch('worker sees paid only after outer commit', $seen === [1], $seen);
$seen = [];
try {
    $service->transaction(function () use ($service, &$seen) {
        $service->transaction(function () use (&$seen) { deferDispatch(function () use (&$seen) { $seen[] = 'escaped'; }); });
        throw new RuntimeException('outer rollback');
    });
} catch (RuntimeException $e) {}
checkDispatch('outer rollback discards nested publication', $seen === [], $seen);
$service->transaction(function () use (&$seen) { deferDispatch(function () use (&$seen) { $seen[] = 'fresh'; }); });
checkDispatch('rollback callbacks cannot leak into next transaction', $seen === ['fresh'], $seen);

function app($name = null) {
    $container = think\Container::getInstance();
    return $name === null ? $container : $container->make($name);
}
function sys_config($name, $default = null) { return $name === 'queue_open' ? (int)getenv('AUDIT_DISPATCH_QUEUE') : $default; }
function getLang($message, $replace = []) { return $message; }
function event($name, $arguments = []) {
    if ($name === 'OrderPaySuccessListener') {
        (new app\listener\order\OrderPaySuccessListener)->handle($arguments);
        if (getenv('AUDIT_DISPATCH_LISTENER_FAIL')) throw new RuntimeException('listener failure');
    } elseif (getenv('AUDIT_NESTED_CAPTURE')) {
        $GLOBALS['nestedEvents'][] = [$name, $arguments];
    }
}
class DispatchOrderModel extends think\Model { protected $table = 'audit_queue_orders'; protected $pk = 'id'; }
class DispatchStatusModel extends think\Model { protected $table = 'audit_queue_status'; }
class DispatchOrderDao extends app\dao\order\StoreOrderDao { protected function setModel(): string { return DispatchOrderModel::class; } }
class DispatchStatusDao extends app\dao\order\StoreOrderStatusDao { protected function setModel(): string { return DispatchStatusModel::class; } }
class RecordingPaymentDispatch extends app\services\order\OrderPaymentDispatchServices {
    public $published = [];
    public $failStep = '';
    protected function publish(string $step, array $order) {
        global $worker;
        if ($step === $this->failStep) return false;
        $this->published[] = ['step' => $step, 'paid' => (int)$worker->table('audit_queue_orders')->where('id', $order['id'])->value('paid')];
        return true;
    }
}
$db->execute('CREATE TABLE IF NOT EXISTS audit_queue_orders (id INT PRIMARY KEY, order_id VARCHAR(64), uid INT, paid INT DEFAULT 0,
    pay_type VARCHAR(20) DEFAULT "", pay_time INT DEFAULT 0, trade_no VARCHAR(64) DEFAULT "", pay_price DECIMAL(12,2) DEFAULT 60,
    combination_id INT DEFAULT 0, refund_status INT DEFAULT 0, seckill_id INT DEFAULT 0, bargain_id INT DEFAULT 0,
    virtual_type INT DEFAULT 0, real_name VARCHAR(20) DEFAULT "fixture", user_phone VARCHAR(20) DEFAULT "fixture",
    user_address VARCHAR(20) DEFAULT "fixture", total_num INT DEFAULT 1, pay_postage DECIMAL(12,2) DEFAULT 0,
    deduction_price DECIMAL(12,2) DEFAULT 0, coupon_price DECIMAL(12,2) DEFAULT 0, add_time INT DEFAULT 1) ENGINE=InnoDB');
// Matches the production status table, including its lack of a primary key.
$db->execute('CREATE TABLE IF NOT EXISTS audit_queue_status (oid INT NOT NULL, change_type VARCHAR(32), change_message VARCHAR(256), change_time INT, KEY(oid), KEY(change_type)) ENGINE=InnoDB');
$orderDao = new DispatchOrderDao;
$statusDao = new DispatchStatusDao;
$success = new app\services\order\StoreOrderSuccessServices($orderDao);
$dispatch = new RecordingPaymentDispatch($statusDao);
$container = think\Container::getInstance();
$container->instance(app\services\order\StoreOrderSuccessServices::class, $success);
$container->instance(app\services\order\OrderPaymentDispatchServices::class, $dispatch);
$container->instance(app\services\order\StoreOrderStatusServices::class, new app\services\order\StoreOrderStatusServices($statusDao));
$container->instance(app\services\order\StoreOrderInvoiceServices::class, new class { public function get($where) { return null; } });
$container->instance(app\services\product\product\StoreProductCouponServices::class, new class { public function giveOrderProductCoupon(...$args) {} });
$container->instance(app\services\order\StoreOrderCartInfoServices::class, new class { public function getCarIdByProductTitle($id) { return 'fixture'; } });
$container->instance(app\services\activity\lottery\LuckLotteryServices::class, new class { public function setCacheLotteryNum(...$args) {} });
function seedDispatch() {
    global $db, $dispatch;
    $db->table('audit_queue_orders')->where('1=1')->delete();
    $db->table('audit_queue_status')->where('1=1')->delete();
    $db->table('audit_queue_orders')->insert(['id' => 1, 'order_id' => 'dispatch-order', 'uid' => 101]);
    $dispatch->published = []; $dispatch->failStep = '';
}
if (defined('PAYMENT_NESTED_BOOTSTRAP')) return;
$notify = new app\services\pay\PayNotifyServices;
seedDispatch();
$service->transaction(function () use ($success, $dispatch) {
    $success->paySuccess(['id' => 1], 'yue');
    checkDispatch('real payment listener stages jobs under nested balance transaction', $dispatch->published === []);
});
checkDispatch('all payment jobs and push stages see committed paid order', count($dispatch->published) === 10 && array_column($dispatch->published, 'paid') === array_fill(0, 10, 1), $dispatch->published);
checkDispatch('successful publication acknowledges pending markers', $db->table('audit_queue_status')->where('change_type', $dispatch::PENDING)->count() === 0);

seedDispatch(); putenv('AUDIT_DISPATCH_LISTENER_FAIL=1');
$failed = $notify->wechatProduct('dispatch-order', null, 'yue'); putenv('AUDIT_DISPATCH_LISTENER_FAIL');
checkDispatch('failed listener rolls back markers and emits no jobs', !$failed && $dispatch->published === [] && $db->table('audit_queue_status')->count() === 0 && (int)$db->table('audit_queue_orders')->value('paid') === 0);

seedDispatch(); $dispatch->failStep = 'agent';
$first = $notify->wechatProduct('dispatch-order', null, 'yue');
checkDispatch('transport failure keeps committed paid state and durable pending markers', !$first && (int)$db->table('audit_queue_orders')->value('paid') === 1 && $db->table('audit_queue_status')->where('change_type', $dispatch::PENDING)->count() === 7, $dispatch->published);
$dispatch->failStep = '';
$retry = $notify->wechatProduct('dispatch-order', null, 'yue');
checkDispatch('paid callback retry resumes failed publication without replaying successful jobs', $retry && count($dispatch->published) === 10 && count(array_unique(array_column($dispatch->published, 'step'))) === 10 && $db->table('audit_queue_status')->where('change_type', 'pay_success')->count() === 1 && $db->table('audit_queue_status')->where('change_type', $dispatch::PENDING)->count() === 0, $dispatch->published);
$notify->wechatProduct('dispatch-order', null, 'yue');
checkDispatch('repeated paid callback with no markers publishes nothing', count($dispatch->published) === 10);

class DispatchTransportJob { use crmeb\traits\QueueTrait; }
class SwallowedFailurePaymentDispatch extends app\services\order\OrderPaymentDispatchServices {
    protected function publish(string $step, array $order) {
        // Existing custom notice listeners catch and log queue exceptions themselves.
        try { DispatchTransportJob::dispatch([$order['id']]); } catch (Throwable $error) {}
        return true;
    }
}
$container->instance('env', new class { public function get($key, $default = null) { return $key === 'cache.driver' ? 'redis' : $default; } });
$container->instance('log', new class { public function error($message) {} });
$transport = new class { public $fail = true; public function connection() { return $this; } public function push(...$args) { return $this->fail ? false : 'job-id'; } };
$container->instance('queue', $transport);
putenv('AUDIT_DISPATCH_QUEUE=1');
$swallowed = new SwallowedFailurePaymentDispatch($statusDao);
$swallowed->stage(1, 'custom_notice');
try { $swallowed->flush(1); } catch (Throwable $error) {}
checkDispatch('caught queue failure cannot acknowledge a pending delivery', $db->table('audit_queue_status')->where('change_type', $dispatch::PENDING)->count() === 1);
$transport->fail = false; $swallowed->flush(1);
checkDispatch('transport recovery can acknowledge previously caught failure', $db->table('audit_queue_status')->where('change_type', $dispatch::PENDING)->count() === 0);
putenv('AUDIT_DISPATCH_QUEUE');

$statusView = new class($statusDao) extends app\services\order\StoreOrderStatusServices {
    public function getPageValue(bool $isPage = true, bool $isRelieve = true) { return [1, 20]; }
};
$dispatch->stage(1, 'agent');
$visible = $statusView->getStatusList(['oid' => 1]);
checkDispatch('customer and admin status pagination hide pending dispatch records', $visible['count'] === 1 && count($visible['list']) === 1 && $visible['list'][0]['change_type'] === 'pay_success', $visible);
$splitStatus = new class($statusDao) extends app\services\order\StoreOrderStatusServices {
    public $copied = [];
    public function selectList(array $where, string $field = '*', int $page = 0, int $limit = 0, string $order = '', array $with = [], bool $search = false) {
        $list = $this->dao->selectList($where, $field, $page, $limit, $order, $with, $search);
        $this->copied = $list->toArray(); return $list;
    }
};
$container->instance(app\services\order\StoreOrderStatusServices::class, $splitStatus);
$container->instance(app\services\order\StoreOrderCreateServices::class, new class { public function getNewOrderId($prefix) { return 'child-fixture'; } });
$cartOriginal = $container->make(app\services\order\StoreOrderCartInfoServices::class);
$container->instance(app\services\order\StoreOrderCartInfoServices::class, new class {
    public function getColumn(...$args) { return [1 => ['cart_num' => 2, 'surplus_num' => 2, 'cart_info' => []]]; }
});
$splitDao = new class extends app\dao\order\StoreOrderDao {
    public function save(array $data) { throw new RuntimeException('stop before creating child'); }
};
$split = new app\services\order\StoreOrderSplitServices($splitDao);
$splitOrder = array_merge($orderDao->getOne(['id' => 1])->toArray(), ['pid' => 0, 'total_price' => '60', 'cart_id' => [1]]);
try { $split->equalSplit(1, [['cart_id' => 1, 'cart_num' => 1]], $splitOrder); } catch (RuntimeException $error) {}
checkDispatch('actual split flow excludes pending execution records from child history', count($splitStatus->copied) === 1 && $splitStatus->copied[0]['change_type'] === 'pay_success', $splitStatus->copied);
$container->instance(app\services\order\StoreOrderCartInfoServices::class, $cartOriginal);
$container->instance(app\services\order\StoreOrderStatusServices::class, $statusView);
$db->table('audit_queue_status')->where('change_type', $dispatch::PENDING)->delete();

class DirectNoticeDispatch extends app\services\order\OrderPaymentDispatchServices {
    public $sender;
    protected function publish(string $step, array $order) { ($this->sender)(); return true; }
}
$direct = new DirectNoticeDispatch($statusDao);
$sms = new class extends app\services\message\notice\SmsService {
    public $fail = true;
    public function __construct() { $this->noticeInfo = ['is_sms' => 1, 'mark' => 'order_pay_success']; }
    public function send(bool $switch, $phone, array $data, string $mark) { if ($this->fail) throw new RuntimeException('SMS unavailable'); return true; }
};
$direct->sender = function () use ($sms) { $sms->sendSms('fixture', []); };
$direct->stage(1, 'notice_user');
try { $direct->flush(1); } catch (Throwable $error) {}
checkDispatch('caught direct SMS exception retains pending payment notice', $db->table('audit_queue_status')->where('change_type', $dispatch::PENDING)->count() === 1);
$sms->fail = false; $direct->flush(1);
$provider = new class { public $fail = true; public function sms($type) { return $this; } public function send(...$args) { return !$this->fail; } };
$container->instance(app\services\serve\ServeServices::class, $provider);
$direct->sender = function () { (new app\listener\notice\CustomNoticeListener)->sendSms(101, ['sms_text' => 'order {order_id}', 'sms_id' => 'fixture'], ['order_id' => 'fixture', 'phone' => 'fixture']); };
$direct->stage(1, 'custom_notice');
try { $direct->flush(1); } catch (Throwable $error) {}
checkDispatch('custom SMS provider false retains pending payment notice', $db->table('audit_queue_status')->where('change_type', $dispatch::PENDING)->count() === 1);
$provider->fail = false; $direct->flush(1);
checkDispatch('direct SMS recovery acknowledges pending notice', $db->table('audit_queue_status')->where('change_type', $dispatch::PENDING)->count() === 0);

class PaymentDispatchBoundaryRedis extends Redis {
    public $accept = false;
    public function rPush($key, ...$values) { return $this->accept ? 1 : false; }
    public function zAdd($key, $score_or_options, ...$values) { return $this->accept ? 1 : false; }
}
$redisBoundary = new PaymentDispatchBoundaryRedis;
$redisConnector = new think\queue\connector\Redis($redisBoundary, 'payment-fixture');
$container->instance('queue', new class($redisConnector) {
    private $connector;
    public function __construct($connector) { $this->connector = $connector; }
    public function connection() { return $this->connector; }
});
$container->instance('config', new class { public function get($key, $default = null) { return $default; } });
putenv('AUDIT_DISPATCH_QUEUE=1');
foreach (['push', 'later'] as $method) {
    $redisBoundary->accept = false;
    $direct->sender = function () use ($method) {
        if ($method === 'push') DispatchTransportJob::dispatch([1]);
        else DispatchTransportJob::dispatchSecs(10, 'doJob', [1]);
    };
    $direct->stage(1, 'custom_notice');
    try { $direct->flush(1); } catch (Throwable $error) {}
    checkDispatch('real Redis ' . $method . ' rejection retains durable pending stage', $db->table('audit_queue_status')->where('change_type', $dispatch::PENDING)->count() === 1);
    $redisBoundary->accept = true; $direct->flush(1);
    checkDispatch('real Redis ' . $method . ' recovery acknowledges stage', $db->table('audit_queue_status')->where('change_type', $dispatch::PENDING)->count() === 0);
}
putenv('AUDIT_DISPATCH_QUEUE');

echo json_encode($checks, JSON_PRETTY_PRINT), "\n";
exit(count(array_filter($checks, function ($check) { return !$check['pass']; })) ? 1 : 0);
