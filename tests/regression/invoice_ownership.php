<?php
// Real controller/service methods with in-memory DAO/provider boundaries. No application boot, DB or network.
error_reporting(E_ALL & ~E_DEPRECATED);
$root = dirname(__DIR__, 2) . '/crmeb';
$prefixes = require $root . '/vendor/composer/autoload_psr4.php';
spl_autoload_register(function ($class) use ($prefixes) {
    foreach ($prefixes as $prefix => $dirs) {
        if (strpos($class, $prefix) !== 0) continue;
        foreach ($dirs as $dir) {
            $file = $dir . '/' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
            if (is_file($file)) { require $file; return; }
        }
    }
});
class InvoiceTestContainer {
    public $instances = [];
    public function make($name) {
        if (!isset($this->instances[$name])) throw new LogicException('Unmocked dependency: ' . $name);
        return $this->instances[$name];
    }
}
$container = new InvoiceTestContainer;
function app($name = null) { global $container; return $name === null ? $container : $container->make($name); }
function getLang($message, $replace = []) { return $message; }
function filter_str($value) { return $value; }
function sys_config($name, $default = null) { return ['invoice_func_status' => 1, 'elec_invoice' => 0][$name] ?? $default; }
function event($name, $args = []) {}
$container->instances['json'] = new class {
    public function success($data = [], $extra = null) { return ['status' => 200, 'data' => $extra ?? $data]; }
    public function fail($message) { return ['status' => 400, 'msg' => $message]; }
};
class InvoiceRecord extends ArrayObject {
    public function __construct($data) { parent::__construct($data, ArrayObject::ARRAY_AS_PROPS); }
    public function toArray() { return $this->getArrayCopy(); }
}
function invoiceMatches(array $row, array $where) {
    foreach ($where as $key => $value) {
        $matches = false;
        foreach (explode('|', $key) as $field) {
            if (array_key_exists($field, $row) && $row[$field] == $value) $matches = true;
        }
        if (!$matches) return false;
    }
    return true;
}
class InvoiceMemoryDao extends app\dao\user\UserInvoiceDao {
    public $rows = [];
    public $writes = 0;
    public function __construct() {
        foreach ([101, 202, 0] as $index => $uid) {
            $id = 7001 + $index;
            $this->rows[$id] = ['id' => $id, 'uid' => $uid, 'name' => 'Owner ' . $uid, 'drawer_phone' => 'synthetic',
                'type' => 1, 'header_type' => 1, 'is_del' => 0, 'is_default' => 0];
        }
    }
    public function getOne(array $where, ?string $field = '*', array $with = []) {
        foreach ($this->rows as $row) if (invoiceMatches($row, $where)) return new InvoiceRecord($row);
        return null;
    }
    public function get($id, ?array $field = [], ?array $with = []) { return $this->getOne(is_array($id) ? $id : ['id' => $id]); }
    public function getList(array $where, string $field = '*', int $page = 0, int $limit = 0) {
        return array_values(array_filter($this->rows, function ($row) use ($where) { return invoiceMatches($row, $where); }));
    }
    public function update($id, array $data, ?string $key = null) {
        $where = is_array($id) ? $id : [($key ?: 'id') => $id];
        $changed = 0;
        foreach ($this->rows as &$row) {
            if (invoiceMatches($row, $where)) { $row = array_merge($row, $data); $changed++; $this->writes++; }
        }
        return $changed;
    }
    public function save(array $data) {
        $data['id'] = 7010; $this->rows[7010] = $data; $this->writes++;
        return new InvoiceRecord($data);
    }
    public function setDefault(int $uid, int $id, $header_type, $type) { return $this->update($id, ['is_default' => 1]); }
}
class InvoiceOrderMemoryDao extends app\dao\order\StoreOrderInvoiceDao {
    public $rows = [];
    public $writes = 0;
    public function getOne(array $where, ?string $field = '*', array $with = []) {
        foreach ($this->rows as $row) if (invoiceMatches($row, $where)) return new InvoiceRecord($row);
        return null;
    }
    public function getList(array $where, string $field = '*', array $with = ['order'], string $order = '', int $page = 0, int $limit = 0) {
        return array_values(array_filter($this->rows, function ($row) use ($where) { return invoiceMatches($row, $where); }));
    }
    public function save(array $data) {
        $data['id'] = 9001; $this->rows[9001] = $data; $this->writes++;
        return new InvoiceRecord($data);
    }
}
class InvoicePagedService extends app\services\user\UserInvoiceServices {
    public function getPageValue(bool $isPage = true, bool $isRelieve = true) { return [1, 20]; }
}
class InvoiceOrderPagedService extends app\services\order\StoreOrderInvoiceServices {
    public function getPageValue(bool $isPage = true, bool $isRelieve = true) { return [1, 20]; }
}
class InvoiceTestRequest extends app\Request {
    public function __construct($uid, array $params = []) {
        $this->param = $params; $this->mergeParam = true;
        $this->macro('uid', function () use ($uid) { return $uid; });
    }
}
// Support the pre-fix signature as well so the red run demonstrates exposure, not an argument type error.
function invoiceEndpoint($controller, $method, $request, $id) {
    $reflection = new ReflectionMethod($controller, $method);
    return $reflection->getNumberOfParameters() === 1 ? $controller->$method($id) : $controller->$method($request, $id);
}
function ensure($condition, $message) { if (!$condition) throw new LogicException($message); }
function denied(callable $call) {
    try { $result = $call(); }
    catch (crmeb\exceptions\ApiException | crmeb\exceptions\AdminException $error) { return; }
    ensure(isset($result['status']) && ($result['status'] !== 200 || ($result['data'] ?? null) === []) || $result === [], 'Unauthorized operation was accepted');
}
$failures = [];
$count = 0;
function testInvoice($name, callable $test) {
    global $failures, $count;
    $count++;
    try { $test(); echo "PASS $name\n"; }
    catch (Throwable $error) { $failures[] = $name; echo "FAIL $name: {$error->getMessage()}\n"; }
}
function invoiceFixture() {
    global $container;
    $dao = new InvoiceMemoryDao;
    $service = new app\services\user\UserInvoiceServices($dao);
    $container->instances[app\services\user\UserInvoiceServices::class] = $service;
    $container->instances[app\services\order\StoreOrderServices::class] = new class {
        public function getOne($where) {
            foreach ([['id' => 8001, 'order_id' => 'own-order', 'uid' => 101], ['id' => 8002, 'order_id' => 'foreign-order', 'uid' => 202]] as $row) {
                $row += ['is_del' => 0, 'paid' => 0, 'refund_status' => 0, 'user_phone' => 'synthetic'];
                if (invoiceMatches($row, $where)) return new InvoiceRecord($row);
            }
            return null;
        }
    };
    return [$dao, $service];
}
testInvoice('detail cannot expose a foreign invoice', function () {
    [, $service] = invoiceFixture();
    denied(function () use ($service) { return invoiceEndpoint(new app\api\controller\v2\user\UserInvoiceController($service), 'invoice', new InvoiceTestRequest(101), 7002); });
});
testInvoice('detail returns the authenticated users own invoice', function () {
    [, $service] = invoiceFixture();
    $result = invoiceEndpoint(new app\api\controller\v2\user\UserInvoiceController($service), 'invoice', new InvoiceTestRequest(101), 7001);
    ensure($result['data']['uid'] === 101, 'Own invoice unavailable');
});
testInvoice('foreign invoice update cannot transfer ownership', function () {
    [$dao, $service] = invoiceFixture(); $before = $dao->rows;
    denied(function () use ($service) { return $service->saveInvoice(101, ['id' => 7002, 'name' => 'Changed', 'drawer_phone' => 'synthetic', 'is_default' => 0]); });
    ensure($dao->rows === $before && $dao->writes === 0, 'Foreign invoice changed');
});
testInvoice('own invoice update create default and delete still work', function () {
    [$dao, $service] = invoiceFixture();
    $service->saveInvoice(101, ['id' => 7001, 'name' => 'Changed', 'drawer_phone' => 'synthetic', 'is_default' => 1]);
    ensure($dao->rows[7001]['name'] === 'Changed' && $dao->rows[7001]['uid'] === 101 && $dao->rows[7001]['is_default'] === 1, 'Own edit failed');
    $service->saveInvoice(101, ['id' => 0, 'name' => 'New', 'drawer_phone' => 'synthetic', 'is_default' => 0]);
    ensure($dao->rows[7010]['uid'] === 101, 'Own create failed');
    $service->delInvoice(101, 7001);
    ensure($dao->rows[7001]['is_del'] === 1, 'Own delete failed');
});
foreach ([0, -1] as $uid) {
    foreach (['getInvoice', 'checkInvoice', 'saveInvoice', 'setDefaultInvoice', 'delInvoice', 'getUserDefaultInvoice', 'getUserList'] as $method) {
        testInvoice("$method rejects non-positive uid $uid", function () use ($uid, $method) {
            [$dao, $service] = invoiceFixture();
            $service = new InvoicePagedService($dao);
            $dao->rows[7003]['uid'] = $uid;
            $dao->rows[7003]['is_default'] = 1;
            denied(function () use ($service, $uid, $method) {
                if ($method === 'getUserDefaultInvoice') return $service->$method($uid, 1);
                if ($method === 'getUserList') return $service->$method($uid, []);
                if ($method === 'saveInvoice') return $service->$method($uid, ['id' => 7003, 'name' => 'Changed', 'drawer_phone' => 'synthetic', 'is_default' => 0]);
                return in_array($method, ['getInvoice', 'checkInvoice']) ? $service->$method(7003, $uid) : $service->$method($uid, 7003);
            });
            ensure($dao->writes === 0, 'Unauthenticated operation wrote data');
        });
    }
    testInvoice("order invoice list rejects non-positive uid $uid", function () use ($uid) {
        invoiceFixture(); $dao = new InvoiceOrderMemoryDao;
        $dao->rows[9001] = ['id' => 9001, 'uid' => $uid, 'is_del' => 0, 'is_pay' => 1];
        $service = new InvoiceOrderPagedService($dao);
        denied(function () use ($service, $uid) { return $service->getOrderInvoiceList(['uid' => $uid]); });
    });
}
testInvoice('own default and invoice lists remain available', function () {
    [$dao] = invoiceFixture(); $dao->rows[7001]['is_default'] = 1;
    $service = new InvoicePagedService($dao);
    ensure($service->getUserDefaultInvoice(101, 1)['id'] === 7001, 'Own default unavailable');
    ensure(array_column($service->getUserList(101, []), 'id') === [7001], 'Invoice list leaked foreign owners');
    $orderDao = new InvoiceOrderMemoryDao;
    $orderDao->rows = [
        ['id' => 9001, 'uid' => 101, 'is_del' => 0, 'is_pay' => 1],
        ['id' => 9002, 'uid' => 202, 'is_del' => 0, 'is_pay' => 1]
    ];
    $orderService = new InvoiceOrderPagedService($orderDao);
    ensure(array_column($orderService->getOrderInvoiceList(['uid' => 101]), 'id') === [9001], 'Order invoice list leaked foreign owners');
});
foreach ([['foreign-order', 7001, 101], ['own-order', 7002, 101], ['foreign-order', 7002, 0], ['own-order', 7001, -1]] as $case) {
    testInvoice('application rejects mismatched ownership ' . implode('/', $case), function () use ($case) {
        invoiceFixture(); $dao = new InvoiceOrderMemoryDao; $service = new app\services\order\StoreOrderInvoiceServices($dao);
        denied(function () use ($service, $case) { return $service->makeUp($case[2], $case[0], $case[1]); });
        ensure($dao->writes === 0, 'Unauthorized application saved');
    });
}
testInvoice('application uses the authenticated uid macro and retains own functionality', function () {
    invoiceFixture(); $dao = new InvoiceOrderMemoryDao;
    $controller = new app\api\controller\v2\order\StoreOrderInvoiceController(new app\services\order\StoreOrderInvoiceServices($dao));
    $controller->makeUp(new InvoiceTestRequest(101, ['order_id' => 'own-order', 'invoice_id' => 7001]));
    ensure($dao->rows[9001]['uid'] === 101 && $dao->rows[9001]['order_id'] === 8001, 'Own application failed');
});
class InvoiceUidSpy extends app\services\order\StoreOrderInvoiceServices {
    public function __construct() {}
    public function makeUp(int $uid, $order_id, int $invoice_id) { return ['uid' => $uid]; }
}
testInvoice('controller forwards uid() rather than request parameter uid', function () {
    $controller = new app\api\controller\v2\order\StoreOrderInvoiceController(new InvoiceUidSpy);
    $result = $controller->makeUp(new InvoiceTestRequest(101, ['order_id' => 'own-order', 'invoice_id' => 7001, 'uid' => 202]));
    ensure($result['data']['uid'] === 101, 'Authenticated UID was not forwarded');
});
class InvoiceDetailOrderService extends app\services\order\StoreOrderServices {
    public $queries = 0;
    public function __construct() {}
    public function getUserOrderDetail(string $key, int $uid, $with = []) { $this->queries++; return null; }
}
testInvoice('invoice order detail never performs an unscoped zero-uid order lookup', function () {
    $orders = new InvoiceDetailOrderService;
    $controller = new app\api\controller\v2\order\StoreOrderInvoiceController(new app\services\order\StoreOrderInvoiceServices(new InvoiceOrderMemoryDao));
    denied(function () use ($controller, $orders) { return $controller->detail($orders, new InvoiceTestRequest(0), 'foreign-order'); });
    ensure($orders->queries === 0, 'Zero UID reached order lookup, where it disables the owner predicate');
});
foreach ([['foreign', 202, 0, 'issued'], ['deleted', 101, 1, 'issued'], ['unissued', 101, 0, ''], ['missing', null, 0, ''], ['own', 101, 0, 'issued'], ['zero-uid', 0, 0, 'issued']] as $case) {
    testInvoice('download ' . $case[0], function () use ($case) {
        global $container;
        $dao = new InvoiceOrderMemoryDao;
        if ($case[1] !== null) $dao->rows[9001] = ['id' => 9001, 'uid' => $case[1], 'is_del' => $case[2], 'invoice_num' => $case[3]];
        $provider = new class {
            public $downloads = 0;
            public function invoice() { return $this; }
            public function downloadInvoice($number) { $this->downloads++; return ['url' => 'synthetic://' . $number]; }
        };
        $container->instances[app\services\serve\ServeServices::class] = $provider;
        $controller = new app\api\controller\v2\order\StoreOrderInvoiceController(new app\services\order\StoreOrderInvoiceServices($dao));
        $call = function () use ($controller, $case) { return invoiceEndpoint($controller, 'downInvoice', new InvoiceTestRequest($case[0] === 'zero-uid' ? 0 : 101), 9001); };
        if ($case[0] === 'own') {
            $result = $call(); ensure($result['data']['url'] === 'synthetic://issued' && $provider->downloads === 1, 'Own download failed');
        } else {
            denied($call); ensure($provider->downloads === 0, 'Provider invoked for unavailable invoice');
        }
    });
}
echo "\n$count cases, " . count($failures) . " failed (isolated real methods; no database integration).\n";
exit($failures ? 1 : 0);
