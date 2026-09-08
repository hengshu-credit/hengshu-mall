<?php
/** Real ThinkPHP ORM + disposable MySQL integration tests. Never point at a shared database. */
require dirname(__DIR__, 2) . '/crmeb/vendor/autoload.php';
if (getenv('CRMEB_AUDIT_DATABASE') !== 'crmeb_audit') {
    throw new RuntimeException('Requires the isolated crmeb_audit database');
}
$db = new think\DbManager;
$db->setConfig(['default' => 'mysql', 'connections' => ['mysql' => [
    'type' => 'mysql', 'hostname' => '127.0.0.1', 'hostport' => 3306,
    'database' => 'crmeb_audit', 'username' => 'root', 'password' => 'audit-only-password',
    'charset' => 'utf8mb4', 'prefix' => '', 'fields_strict' => true,
]]]);
think\Model::setDb($db);
class PaymentContainer {
    public $instances = [];
    public function make($name) { return $this->instances[$name] ?? new $name; }
}
$container = new PaymentContainer;
function app($name = null) { global $container; return $name === null ? $container : $container->make($name); }
function sys_config($key, $default = null) { return $default; }
function getLang($message, $replace = []) { return $message; }
function event($name, $data = []) {
    global $db;
    if ($name === 'OrderPaySuccessListener') {
        $db->table('audit_effects')->insert(['order_id' => $data[0]['id']]);
        if (getenv('AUDIT_FAIL_LISTENER')) throw new RuntimeException('synthetic listener outage');
    }
}
class PaymentOrderModel extends think\Model { protected $table = 'audit_orders'; protected $pk = 'id'; }
class PaymentBalanceModel extends think\Model {
    protected $table = 'audit_balances'; protected $pk = 'uid';
    public function save(array $data = [], string $sequence = null): bool {
        if (getenv('AUDIT_DELAY')) usleep(200000);
        return parent::save($data, $sequence);
    }
}
class PaymentOrderDao extends app\dao\order\StoreOrderDao {
    protected function setModel(): string { return PaymentOrderModel::class; }
    public function update($id, array $data, ?string $key = null) {
        if (getenv('AUDIT_DELAY')) usleep(200000);
        return parent::update($id, $data, $key);
    }
}
class PaymentBalanceDao extends app\dao\BaseDao { protected function setModel(): string { return PaymentBalanceModel::class; } }
class PaymentStatusModel extends think\Model { protected $table = 'audit_dispatch_status'; protected $pk = 'id'; }
class PaymentStatusDao extends app\dao\order\StoreOrderStatusDao { protected function setModel(): string { return PaymentStatusModel::class; } }
trait PaymentTransaction {
    public function transaction(callable $closure, bool $isTran = true) {
        global $db;
        return $isTran ? crmeb\utils\AfterCommit::transaction(function ($work) use ($db) { return $db->transaction($work); }, $closure) : $closure();
    }
}
class PaymentSuccess extends app\services\order\StoreOrderSuccessServices { use PaymentTransaction; }
class PaymentYue extends app\services\pay\YuePayServices { use PaymentTransaction; }
class PaymentRefund extends app\services\order\StoreOrderRefundServices { use PaymentTransaction; }
class PaymentOrders extends app\services\order\StoreOrderServices { use PaymentTransaction; }
class PaymentDispatch extends app\services\order\OrderPaymentDispatchServices {
    use PaymentTransaction;
    protected function publish(string $step, array $order) {
        if (getenv('AUDIT_FAIL_PUBLISH')) return false;
        // Simulate a worker on another connection: uncommitted orders must not escape.
        $worker = new PDO('mysql:host=127.0.0.1;dbname=crmeb_audit', 'root', 'audit-only-password');
        $query = $worker->prepare('SELECT paid FROM audit_orders WHERE id = ?');
        $query->execute([$order['id']]);
        if ((int)$query->fetchColumn() !== 1) throw new RuntimeException('Worker observed unpaid order');
        return true;
    }
}
class PaymentUser extends app\services\BaseServices {
    public function __construct($dao) { $this->dao = $dao; }
    public function getUserInfo($uid) { return $this->dao->getOne(['uid' => $uid]); }
}
class PaymentMoneyLog {
    public function income($type, $uid, $amount, $balance, $orderId) {
        global $db;
        if (getenv('AUDIT_FAIL_LEDGER')) return false;
        return $db->table('audit_money')->insert(['uid' => $uid, 'amount' => $amount, 'balance' => $balance, 'order_id' => $orderId]);
    }
}
$orderDao = new PaymentOrderDao;
$balanceDao = new PaymentBalanceDao;
$success = new PaymentSuccess($orderDao);
$container->instances[app\services\order\StoreOrderSuccessServices::class] = $success;
$container->instances[app\services\order\OrderPaymentDispatchServices::class] = new PaymentDispatch(new PaymentStatusDao);
$container->instances[app\services\user\UserServices::class] = new PaymentUser($balanceDao);
$container->instances[app\services\user\UserMoneyServices::class] = new PaymentMoneyLog;
$container->instances[app\services\order\StoreOrderCartInfoServices::class] = new class {
    public function getCarIdByProductTitle($id) { return 'fixture'; }
};
$container->instances[app\services\activity\lottery\LuckLotteryServices::class] = new class {
    public function setCacheLotteryNum(...$args) {}
};
$notify = new app\services\pay\PayNotifyServices;
$yue = new PaymentYue;
$orders = new PaymentOrders($orderDao);
$container->instances[app\services\order\StoreOrderCreateServices::class] = new class {
    public function getNewOrderId($prefix) { return $prefix . '-fixture-' . uniqid(); }
};
if (($argv[1] ?? '') === 'worker') {
    try {
        switch ($argv[2]) {
            case 'debit': $value = $balanceDao->bcDec(101, 'now_money', '60.00', 'uid'); break;
            case 'credit': $value = $balanceDao->bcInc(101, 'now_money', '0.01', 'uid'); break;
            case 'notify': $value = $notify->wechatProduct('audit-order-1'); break;
            case 'pay': $value = $yue->yueOrderPay($orderDao->getOne(['id' => (int)$argv[3]])->toArray(), 101); break;
        }
        echo json_encode(['result' => $value]);
    } catch (Throwable $e) { echo json_encode(['error' => $e->getMessage()]); }
    exit;
}
// This database is disposable and has no connection to the running mall.
$db->execute('CREATE TABLE IF NOT EXISTS audit_balances (uid INT PRIMARY KEY, now_money DECIMAL(18,4) NOT NULL) ENGINE=InnoDB');
$db->execute('CREATE TABLE IF NOT EXISTS audit_orders (id INT PRIMARY KEY, order_id VARCHAR(64), uid INT, pay_uid INT DEFAULT 0, paid TINYINT DEFAULT 0, pay_type VARCHAR(20) DEFAULT "", pay_time INT DEFAULT 0, trade_no VARCHAR(64) DEFAULT "", pay_price DECIMAL(12,2), combination_id INT DEFAULT 0, refund_status INT DEFAULT 0, real_name VARCHAR(20) DEFAULT "A", user_phone VARCHAR(20) DEFAULT "fixture", user_address VARCHAR(20) DEFAULT "fixture", total_num INT DEFAULT 1, pay_postage DECIMAL(12,2) DEFAULT 0, deduction_price DECIMAL(12,2) DEFAULT 0, coupon_price DECIMAL(12,2) DEFAULT 0, add_time INT DEFAULT 1) ENGINE=InnoDB');
$db->execute('CREATE TABLE IF NOT EXISTS audit_effects (id INT AUTO_INCREMENT PRIMARY KEY, order_id INT) ENGINE=InnoDB');
$db->execute('CREATE TABLE IF NOT EXISTS audit_money (id INT AUTO_INCREMENT PRIMARY KEY, uid INT, amount DECIMAL(12,2), balance DECIMAL(18,4), order_id INT) ENGINE=InnoDB');
$db->execute('CREATE TABLE IF NOT EXISTS audit_dispatch_status (id INT AUTO_INCREMENT PRIMARY KEY, oid INT, change_type VARCHAR(32), change_message VARCHAR(256), change_time INT) ENGINE=InnoDB');
$fields = array_column($db->query('SHOW COLUMNS FROM audit_orders'), 'Field');
foreach (['is_cancel', 'is_del', 'is_system_del', 'is_channel'] as $field) {
    if (!in_array($field, $fields)) $db->execute('ALTER TABLE audit_orders ADD `' . $field . '` INT DEFAULT 0');
}
function seed() {
    global $db;
    foreach (['audit_balances', 'audit_orders', 'audit_effects', 'audit_money', 'audit_dispatch_status'] as $table) $db->table($table)->where('1=1')->delete();
    $db->table('audit_balances')->insertAll([['uid' => 101, 'now_money' => '100.00'], ['uid' => 202, 'now_money' => '100.00']]);
    $db->table('audit_orders')->insertAll([
        ['id' => 1, 'order_id' => 'audit-order-1', 'uid' => 101, 'pay_uid' => 101, 'pay_price' => '60.00'],
        ['id' => 2, 'order_id' => 'audit-order-2', 'uid' => 101, 'pay_uid' => 101, 'pay_price' => '60.00'],
    ]);
}
function pair($action, $ids = [1, 1]) {
    $running = [];
    foreach ($ids as $id) {
        $cmd = [PHP_BINARY, __FILE__, 'worker', $action, (string)$id];
        $process = proc_open($cmd, [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
        $running[] = [$process, $pipes];
    }
    $results = [];
    foreach ($running as [$process, $pipes]) {
        $out = stream_get_contents($pipes[1]); $err = stream_get_contents($pipes[2]);
        fclose($pipes[1]); fclose($pipes[2]);
        $code = proc_close($process);
        $results[] = ['output' => json_decode($out, true) ?? $out, 'stderr' => $err, 'exit' => $code];
    }
    return $results;
}
$checks = [];
function assertCase($name, $pass, $evidence) {
    global $checks; $checks[] = ['test' => $name, 'pass' => (bool)$pass, 'evidence' => $evidence];
    fwrite(STDERR, ($pass ? 'PASS ' : 'FAIL ') . $name . "\n");
}
putenv('AUDIT_DELAY=1');
seed(); $workers = pair('debit');
$money = $db->table('audit_balances')->where('uid', 101)->value('now_money');
$accepted = count(array_filter($workers, function ($w) { return ($w['output']['result'] ?? false) === true; }));
assertCase('concurrent debit rejects insufficient second debit', $accepted === 1 && bccomp($money, '40', 2) === 0, compact('workers', 'money'));
seed(); $workers = pair('credit');
$money = $db->table('audit_balances')->where('uid', 101)->value('now_money');
assertCase('concurrent credits are not lost', bccomp($money, '100.02', 2) === 0, compact('workers', 'money'));
seed(); $workers = pair('notify');
$effects = $db->table('audit_effects')->count();
assertCase('concurrent callbacks emit one business event', $effects === 1, compact('workers', 'effects'));
seed(); putenv('AUDIT_FAIL_LISTENER=1'); $first = $notify->wechatProduct('audit-order-1');
$paidAfterFailure = (int)$db->table('audit_orders')->where('id', 1)->value('paid');
putenv('AUDIT_FAIL_LISTENER'); $retry = $notify->wechatProduct('audit-order-1');
$effects = $db->table('audit_effects')->count();
assertCase('listener failure rolls back and callback can retry', !$first && $paidAfterFailure === 0 && $retry && $effects === 1, compact('first', 'paidAfterFailure', 'retry', 'effects'));
seed(); $workers = pair('pay', [1, 2]);
$paid = $db->table('audit_orders')->where('paid', 1)->count();
$money = $db->table('audit_balances')->where('uid', 101)->value('now_money');
assertCase('two orders cannot spend the same balance', $paid === 1 && bccomp($money, '40', 2) === 0, compact('workers', 'paid', 'money'));
seed(); $db->table('audit_balances')->where('uid', 101)->update(['now_money' => '200.00']);
$stale = $orderDao->getOne(['id' => 1])->toArray();
$yue->yueOrderPay($stale, 101);
try { $yue->yueOrderPay($stale, 101); } catch (Throwable $e) {}
$ledgerCount = $db->table('audit_money')->count();
$effects = $db->table('audit_effects')->count();
assertCase('repeated stale payment cannot debit again', $ledgerCount === 1 && $effects === 1, compact('ledgerCount', 'effects'));
seed();
$refund = (new ReflectionClass(PaymentRefund::class))->newInstanceWithoutConstructor();
$refund->yueRefund(['id' => 1, 'uid' => 101, 'pay_uid' => 202], ['refund_price' => '60.00']);
$payerMoney = $db->table('audit_balances')->where('uid', 202)->value('now_money');
$ownerMoney = $db->table('audit_balances')->where('uid', 101)->value('now_money');
$refundLedger = $db->table('audit_money')->where(['order_id' => 1, 'uid' => 202])->find();
assertCase('friend balance refund returns to payer', bccomp($payerMoney, '160', 2) === 0 && bccomp($ownerMoney, '100', 2) === 0
    && (int)$refundLedger['uid'] === 202 && bccomp($refundLedger['balance'], '160', 2) === 0, compact('payerMoney', 'ownerMoney', 'refundLedger'));
seed(); putenv('AUDIT_FAIL_LEDGER=1'); $rejected = false;
try { $refund->yueRefund(['id' => 1, 'uid' => 101, 'pay_uid' => 202], ['refund_price' => '60.00']); } catch (Throwable $e) { $rejected = true; }
putenv('AUDIT_FAIL_LEDGER');
$payerMoney = $db->table('audit_balances')->where('uid', 202)->value('now_money');
$ledgerCount = $db->table('audit_money')->count();
assertCase('failed refund ledger rolls back payer credit', $rejected && bccomp($payerMoney, '100', 2) === 0 && $ledgerCount === 0, compact('rejected', 'payerMoney', 'ledgerCount'));
seed(); $refund->yueRefund(['id' => 1, 'uid' => 101, 'pay_uid' => 0], ['refund_price' => '60.00']);
$ownerMoney = $db->table('audit_balances')->where('uid', 101)->value('now_money');
assertCase('legacy refund without payer falls back to owner', bccomp($ownerMoney, '160', 2) === 0, compact('ownerMoney'));
seed(); $balanceDao->bcInc(101, 'now_money', '0.0001', 'uid', 4);
$precise = $db->table('audit_balances')->where('uid', 101)->value('now_money');
assertCase('decimal helper respects caller scale', $precise === '100.0001', compact('precise'));
seed(); putenv('AUDIT_FAIL_LISTENER=1');
try { $yue->yueOrderPay($orderDao->getOne(['id' => 1])->toArray(), 101); } catch (Throwable $e) {}
putenv('AUDIT_FAIL_LISTENER');
$money = $db->table('audit_balances')->where('uid', 101)->value('now_money');
$ledgerCount = $db->table('audit_money')->count();
$paid = (int)$db->table('audit_orders')->where('id', 1)->value('paid');
assertCase('failed balance payment rolls back debit and ledger', bccomp($money, '100', 2) === 0 && $ledgerCount === 0 && $paid === 0, compact('money', 'ledgerCount', 'paid'));
seed();
try { $prepared = $orders->preparePayment('audit-order-1', 202, 2, true); } catch (Throwable $e) { $prepared = ['error' => $e->getMessage()]; }
assertCase('unpaid friend payment records the actual payer', ($prepared['pay_uid'] ?? null) === 202, $prepared);
seed(); $db->table('audit_orders')->where('id', 1)->update(['paid' => 1, 'pay_uid' => 202]);
$rejected = false;
try { $orders->preparePayment('audit-order-1', 303, 3, true); } catch (Throwable $e) { $rejected = true; }
$unchanged = $orderDao->getOne(['id' => 1])->toArray();
assertCase('late payer cannot replace a completed payment identity', $rejected && $unchanged['pay_uid'] === 202 && $unchanged['order_id'] === 'audit-order-1', ['rejected' => $rejected, 'pay_uid' => $unchanged['pay_uid'], 'order_id' => $unchanged['order_id']]);
seed(); $rejected = false;
try { $orders->preparePayment('audit-order-1', 202, 2, false); } catch (Throwable $e) { $rejected = true; }
assertCase('ordinary payment requires the order owner', $rejected, ['rejected' => $rejected]);
seed(); $stale = $orderDao->getOne(['id' => 1])->toArray(); putenv('AUDIT_FAIL_PUBLISH=1');
try { $yue->yueOrderPay($stale, 101); } catch (Throwable $e) {}
$pendingBefore = $db->table('audit_dispatch_status')->count(); putenv('AUDIT_FAIL_PUBLISH');
$retried = $yue->yueOrderPay($stale, 101);
$pendingAfter = $db->table('audit_dispatch_status')->count();
$ledgerCount = $db->table('audit_money')->count();
assertCase('balance retry resumes pending delivery without another charge', $pendingBefore > 0 && $pendingAfter === 0 && $ledgerCount === 1, compact('pendingBefore', 'pendingAfter', 'ledgerCount', 'retried'));
echo json_encode(['database' => 'disposable MySQL, real ThinkPHP ORM', 'checks' => $checks], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), "\n";
exit(count(array_filter($checks, function ($c) { return !$c['pass']; })) ? 1 : 0);
