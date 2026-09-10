<?php
// Real ORM/service integration against an isolated database; see run-full-reduction.ps1.
require dirname(__DIR__, 2) . '/crmeb/vendor/autoload.php';
use app\services\activity\fullreduction\FullReductionConfig;
use app\services\activity\fullreduction\FullReductionInstaller;
use app\services\activity\fullreduction\StoreFullReductionServices;
use crmeb\exceptions\AdminException;
use think\facade\Db;

function checkReduction($name, $ok) {
    if (!$ok) throw new RuntimeException('FAIL: ' . $name);
    echo 'PASS: ' . $name . PHP_EOL;
}
function rejectReduction($name, callable $fn) {
    try { $fn(); } catch (AdminException $error) { checkReduction($name, true); return; }
    checkReduction($name, false);
}
function getLang($message, $replace = []) { return $message; }
function sys_config($key, $default = null) { return $default; }
date_default_timezone_set('Asia/Shanghai');
$valid = [
    'name' => '周末满减', 'start_time' => time() + 3600, 'end_time' => time() + 86400,
    'unit' => 1, 'rules_type' => 1, 'discount_type' => 1, 'rules' => [['threshold' => '100', 'discount' => '10']],
    'range_type' => 3, 'product_ids' => [1], 'level_ids' => [], 'member_type' => 'all', 'member_ids' => [],
    'tag_match' => 'any', 'status' => 1, 'sort' => 50,
];
$normalized = FullReductionConfig::normalize($valid);
checkReduction('money normalized without losing cents', $normalized['rules'][0] === ['threshold' => '100.00', 'discount' => '10.00']);
foreach ([
    ['name' => '   '], ['name' => str_repeat('名', 61)], ['start_time' => '2026-02-30 00:00:00'],
    ['end_time' => $valid['start_time']], ['end_time' => null], ['unit' => true], ['status' => 2],
    ['rules' => []], ['rules' => array_fill(0, 6, $valid['rules'][0])],
    ['rules' => [['threshold' => 100, 'discount' => 100]]],
    ['rules' => [['threshold' => 100, 'discount' => '0.001']]],
    ['rules' => [['threshold' => 0, 'discount' => 1]]],
    ['rules' => [['threshold' => 100, 'discount' => 10], ['threshold' => 99, 'discount' => 20]]],
    ['unit' => 2, 'rules' => [['threshold' => '1.5', 'discount' => 1]]],
    ['rules_type' => 0, 'discount_type' => 2],
    ['rules_type' => 0, 'rules' => [['threshold' => 100, 'discount' => 10], ['threshold' => 200, 'discount' => 20]]],
    ['discount_type' => 2, 'rules' => [['threshold' => 100, 'discount' => 10]]],
    ['range_type' => 1], ['product_ids' => []], ['product_ids' => [true]], ['product_ids' => ['1 OR 1=1']],
    ['member_type' => 'unknown'], ['member_type' => 'user', 'member_ids' => []], ['tag_match' => 'invalid'], ['sort' => '1.1'],
] as $bad) rejectReduction('reject invalid configuration ' . json_encode($bad), function () use ($valid, $bad) { FullReductionConfig::normalize(array_replace($valid, $bad)); });
checkReduction('quantity reduction and cycle are valid', FullReductionConfig::normalize(array_replace($valid, ['unit' => 2, 'rules_type' => 0, 'rules' => [['threshold' => 3, 'discount' => 10]]]))['rules'][0]['threshold'] === '3');
checkReduction('discount boundary accepted', FullReductionConfig::normalize(array_replace($valid, ['discount_type' => 2, 'rules' => [['threshold' => 100, 'discount' => 9.9]]]))['rules'][0]['discount'] === '9.90');
checkReduction('inactive selections cleared', FullReductionConfig::normalize(array_replace($valid, ['range_type' => 0, 'member_ids' => [5]]))['product_ids'] === []);
foreach ([[99, 'pending'], [100, 'running'], [199, 'running'], [200, 'ended']] as [$now, $expected]) {
    checkReduction('state boundary ' . $now, FullReductionConfig::activityState(['status' => 1, 'start_time' => 100, 'end_time' => 200], $now) === $expected);
}
checkReduction('disabled overrides dates', FullReductionConfig::activityState(['status' => 0, 'start_time' => 100, 'end_time' => 200], 300) === 'disabled');

if (getenv('CRMEB_AUDIT_DATABASE') !== 'crmeb_reduction_audit') throw new RuntimeException('Use the isolated test runner');
$testApp = new think\App(dirname(__DIR__, 2) . '/crmeb/');
think\Container::setInstance($testApp);
function app($name = null) { global $testApp; return $name === null ? $testApp : $testApp->make($name); }
function config($name, $default = null) { return app()->config->get($name, $default); }
$db = new think\DbManager();
$db->setConfig(['default' => 'mysql', 'connections' => ['mysql' => [
    'type' => 'mysql', 'hostname' => '127.0.0.1', 'hostport' => 3306,
    'database' => 'crmeb_reduction_audit', 'username' => 'root', 'password' => 'reduction-audit-only',
    'charset' => 'utf8mb4', 'prefix' => 'test_', 'fields_strict' => true,
]]]);
$testApp->instance('db', $db);
$testApp->config->set(['default' => 'file', 'stores' => ['file' => ['type' => 'File', 'path' => sys_get_temp_dir() . '/reduction-audit-cache/']]], 'cache');
think\Model::setDb($db);
// Apply the same model defaults as normal HTTP requests (timestamp + formatted dates).
(new think\service\ModelService($testApp))->boot();
$installSql = file_get_contents(dirname(__DIR__, 2) . '/crmeb/public/install/crmeb.sql');
foreach (['system_menus', 'system_role', 'store_product', 'system_user_level', 'user', 'user_label', 'user_label_relation', 'store_category', 'store_product_label', 'store_order', 'store_order_cart_info', 'store_coupon_issue', 'store_coupon_user', 'user_bill', 'user_address', 'store_cart', 'store_product_attr_value', 'member_right'] as $table) {
    preg_match('/CREATE TABLE IF NOT EXISTS `eb_' . $table . '`.*?;/s', $installSql, $match);
    Db::execute(str_replace('`eb_', '`test_', $match[0]));
}
Db::name('system_menus')->insert(['id' => 1, 'menu_path' => '/marketing', 'menu_name' => '营销', 'is_show_path' => 1, 'auth_type' => 1]);
FullReductionInstaller::install();
FullReductionInstaller::install();
checkReduction('idempotent custom-prefix installation creates 12 permission entries', Db::name('system_menus')->whereLike('unique_auth', 'marketing-full-reduction-%')->count() === 12);
$installerSource = file_get_contents(dirname(__DIR__, 2) . '/crmeb/public/install/index.php');
$splitStart = strpos($installerSource, 'function sql_split(');
eval(substr($installerSource, $splitStart, strpos($installerSource, 'function _dir_path(', $splitStart) - $splitStart));
$migration = file_get_contents(dirname(__DIR__, 2) . '/crmeb/upgrade/full_reduction.sql');
foreach (sql_split(str_replace(';', ";\n", preg_replace('/\R/', ' ', $migration)), 'test_') as $statement) if (trim($statement)) Db::execute(str_replace('`eb_', '`test_', trim($statement)));
checkReduction('fresh installer SQL splitter supports migration', Db::name('system_menus')->count() === 13);
$menus = $testApp->make(app\services\system\SystemMenusServices::class);
[$navigation, $permissions] = $menus->getMenusList([], 0);
checkReduction('navigation includes full reduction', in_array('marketing-full-reduction-list', $permissions, true));
Db::name('store_product')->insertAll([
    ['id' => 1, 'store_name' => '测试商品A', 'presale' => 0], ['id' => 2, 'store_name' => '测试商品B', 'presale' => 0],
    ['id' => 3, 'store_name' => '预售商品', 'presale' => 1], ['id' => 4, 'store_name' => '测试商品C', 'presale' => 0],
]);
Db::name('system_user_level')->insertAll([['id' => 1, 'name' => '黄金会员', 'is_show' => 1], ['id' => 2, 'name' => '白金会员', 'is_show' => 1]]);
Db::name('user')->insertAll([['uid' => 1, 'nickname' => '会员A'], ['uid' => 2, 'nickname' => '会员B']]);
Db::name('user_label')->insertAll([['id' => 1, 'label_name' => '老客户'], ['id' => 2, 'label_name' => '高活跃']]);
$service = $testApp->make(StoreFullReductionServices::class);
$id = $service->saveActivity(0, $valid);
$info = $service->activityInfo($id);
checkReduction('create persists full configuration and product labels', $info['name'] === $valid['name'] && $info['products'][0]['name'] === '测试商品A' && $info['state'] === 'pending');
checkReduction('integer update time survives production model defaults', is_int($info['update_time']));
checkReduction('list filter and count', $service->activityList(['name' => '周末', 'state' => 'pending'])['count'] === 1);
checkReduction('option search excludes presale products', $service->options(['type' => 'product', 'keyword' => '预售'])['count'] === 0);
rejectReduction('presale products rejected on save', function () use ($service, $valid) { $service->saveActivity(0, array_replace($valid, ['product_ids' => [3]])); });
rejectReduction('unknown selection rejected', function () use ($service, $valid) { $service->saveActivity(0, array_replace($valid, ['level_ids' => [999]])); });
rejectReduction('overlapping activity rejected', function () use ($service, $valid) { $service->saveActivity(0, $valid); });
$separate = $service->saveActivity(0, array_replace($valid, ['name' => '另一个商品', 'product_ids' => [2]]));
checkReduction('nonoverlapping products allowed', $separate > $id);
$touching = $service->saveActivity(0, array_replace($valid, ['name' => '接续活动', 'start_time' => $valid['end_time'], 'end_time' => $valid['end_time'] + 3600]));
checkReduction('adjacent time intervals do not overlap', $touching > $separate);
$disabled = $service->saveActivity(0, array_replace($valid, ['name' => '停用活动', 'status' => 0]));
rejectReduction('enable rechecks conflicts', function () use ($service, $disabled) { $service->setActivityStatus($disabled, 1); });
checkReduction('failed enable leaves disabled state intact', $service->activityInfo($disabled)['status'] === 0);
$service->setActivityStatus($id, 0);
$service->setActivityStatus($disabled, 1);
checkReduction('enable succeeds after conflict removed', $service->activityInfo($disabled)['status'] === 1);
$service->setActivitySort($disabled, 3);
checkReduction('inline sort persists', $service->activityList([])['list'][0]['id'] === $disabled);
rejectReduction('excluded range still overlaps another selected product', function () use ($service, $valid) { $service->saveActivity(0, array_replace($valid, ['range_type' => 4, 'product_ids' => [1]])); });
$excluded = $service->saveActivity(0, array_replace($valid, ['range_type' => 4, 'product_ids' => [1, 2]]));
checkReduction('excluded range with no intersection allowed', $excluded > 0);
$audience = array_replace($valid, ['name' => '标签客户', 'status' => 0, 'level_ids' => [1], 'member_type' => 'tag', 'member_ids' => [1, 2], 'tag_match' => 'all']);
$audienceId = $service->saveActivity(0, $audience);
$audienceInfo = $service->activityInfo($audienceId);
checkReduction('tags, matching mode and level restriction round trip', count($audienceInfo['members']) === 2 && $audienceInfo['tag_match'] === 'all' && $audienceInfo['level_ids'] === [1]);
$service->saveActivity($audienceId, array_replace($audience, ['member_type' => 'user', 'member_ids' => [2]]));
checkReduction('member type update replaces old selections', $service->activityInfo($audienceId)['members'][0]['name'] === '会员B');
rejectReduction('mutually exclusive member levels rejected', function () use ($service, $audience) { $service->saveActivity(0, array_replace($audience, ['member_type' => 'level', 'member_ids' => [2]])); });
Db::name('user')->where('uid', 2)->update(['is_del' => 1]);
checkReduction('invalid member remains visible in edit response', $service->activityInfo($audienceId)['members'][0]['unavailable'] === true);
rejectReduction('invalidated member rejected when enabling', function () use ($service, $audienceId) { $service->setActivityStatus($audienceId, 1); });
rejectReduction('batch deletion atomic on missing ID', function () use ($service, $disabled) { $service->deleteActivities([$disabled, 99999]); });
checkReduction('failed batch kept valid activity', $service->activityInfo($disabled)['status'] === 1);
$service->deleteActivities([$id, $disabled]);
rejectReduction('deleted activity not readable', function () use ($service, $disabled) { $service->activityInfo($disabled); });
checkReduction('soft delete preserves data', Db::name('store_full_reduction')->where('id', $disabled)->value('is_del') === 1);
Db::name('store_full_reduction')->where('id', $separate)->update(['start_time' => time() - 100, 'end_time' => time() - 1]);
checkReduction('expired state derives from server time', $service->activityInfo($separate)['state'] === 'ended');
rejectReduction('expired activity cannot be enabled', function () use ($service, $separate) { $service->setActivityStatus($separate, 1); });

// Exercise controller guards with real role records, without issuing production tokens.
$roleService = $testApp->make(app\services\system\admin\SystemRoleServices::class);
$readId = Db::name('system_menus')->where('unique_auth', 'marketing-full-reduction-list-api')->value('id');
Db::name('system_role')->insert(['id' => 1, 'role_name' => '只读测试', 'rules' => (string)$readId, 'status' => 1]);
class ReductionPermissionProbe extends app\adminapi\controller\v1\marketing\StoreFullReduction {
    public function __construct() { $this->adminInfo = ['level' => 1, 'roles' => [1]]; }
    public function probe($method, $route) { $this->requirePermission($method, $route); }
}
$probe = new ReductionPermissionProbe();
$probe->probe('get', 'list');
checkReduction('read-only role can read list', true);
foreach ([['post', 'save/<id>'], ['put', 'status/<id>'], ['post', 'batch_delete'], ['get', 'options']] as [$method, $route]) {
    try { $probe->probe($method, $route); throw new RuntimeException('permission unexpectedly passed'); }
    catch (crmeb\exceptions\AuthException $error) { checkReduction('read-only role denied ' . $route, true); }
}
echo "Full reduction regressions passed.\n";
require __DIR__ . '/full_reduction_checkout.php';
