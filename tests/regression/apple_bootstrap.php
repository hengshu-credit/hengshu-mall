<?php
// Isolated Apple authentication tests: no application boot, database or network.
error_reporting(E_ALL);
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
class AppleContainer {
    public $instances = [];
    public function make($name) { return $this->instances[$name]; }
}
$appleContainer = new AppleContainer;
function app($name = null) { global $appleContainer; return $name === null ? $appleContainer : $appleContainer->make($name); }
$appleClientId = 'com.example.regression';
function config($name, $default = null) { global $appleClientId; return $name === 'apple.client_id' ? $appleClientId : $default; }
function sys_config($name, $default = null) { return $default; }
class AppleCache {
    public static $values = [];
    public static function get($name) { return self::$values[$name] ?? null; }
    public static function delete($name) { unset(self::$values[$name]); }
}
class_alias(AppleCache::class, 'crmeb\\services\\CacheService');
$appleContainer->instances['json'] = new class {
    public function success($message = '', $data = []) { return ['status' => 200, 'data' => $data]; }
    public function fail($message) { return ['status' => 400, 'message' => $message]; }
};
class AppleRequest extends app\Request {
    private $appleInput;
    public function __construct(array $input) { $this->appleInput = $input; }
    public function postMore(array $params, bool $suffix = false, bool $filter = true): array {
        return array_map(function ($param) { return $this->appleInput[$param[0]] ?? $param[1]; }, $params);
    }
}
class AppleAuthSpy extends app\services\wechat\WechatServices {
    public $calls = [];
    public $result = ['token' => 'synthetic-session'];
    public function __construct() {}
    public function appAuth(array $data, string $phone, string $type = 'app') {
        $this->calls[] = compact('data', 'phone', 'type');
        return $this->result;
    }
}
function appleCheck($name, $condition) {
    if (!$condition) { fwrite(STDERR, "FAIL: $name\n"); exit(1); }
    echo "PASS: $name\n";
}
