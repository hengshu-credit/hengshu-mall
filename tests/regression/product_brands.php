<?php
// Real services + ORM, isolated database only. Run with run-product-brands.ps1.
require dirname(__DIR__, 2) . '/crmeb/vendor/autoload.php';
function checkBrand($name, $ok) {
    if (!$ok) throw new RuntimeException('FAIL: ' . $name);
    echo 'PASS: ' . $name . PHP_EOL;
}
checkBrand('brand service exists', class_exists(app\services\product\product\StoreProductBrandServices::class));
function rejectBrand($name, callable $fn) {
    try { $fn(); } catch (crmeb\exceptions\AdminException $e) { checkBrand($name, true); return; }
    checkBrand($name, false);
}
function getLang($message, $replace = []) { return $message; }
function sys_config($key, $default = null) { return $default; }
$scope = app\services\product\product\ProductBrandScope::class;
$tree = [1 => ['pid' => 0], 2 => ['pid' => 1], 3 => ['pid' => 2], 4 => ['pid' => 1], 5 => ['pid' => 0]];
checkBrand('normalize and deduplicate IDs', $scope::ids(['2', 2, 3]) === [2, 3]);
checkBrand('leaf includes ancestors only', $scope::ancestors([3], $tree) === [3, 2, 1]);
checkBrand('parent does not include descendants', $scope::ancestors([1], $tree) === [1]);
checkBrand('multiple branches form union', $scope::ancestors([3, 5], $tree) === [3, 2, 1, 5]);
foreach ([[0], [-1], ['1.5'], [true], [[1]], '1,2'] as $bad) {
    rejectBrand('reject malformed IDs', function () use ($scope, $bad) { $scope::ids($bad); });
}
rejectBrand('reject nonexistent category', function () use ($scope, $tree) { $scope::ancestors([99], $tree); });

if (getenv('CRMEB_AUDIT_DATABASE') !== 'crmeb_brand_audit') {
    echo "Scope checks complete; database checks require run-product-brands.ps1\n";
    exit(0);
}
$testApp = new think\App(dirname(__DIR__, 2) . '/crmeb/');
think\Container::setInstance($testApp);
function app($name = null) { global $testApp; return $name === null ? $testApp : $testApp->make($name); }
function config($name, $default = null) { return app()->config->get($name, $default); }
$db = new think\DbManager();
$db->setConfig(['default' => 'mysql', 'connections' => ['mysql' => [
    'type' => 'mysql', 'hostname' => '127.0.0.1', 'hostport' => 3306,
    'database' => 'crmeb_brand_audit', 'username' => 'root', 'password' => 'brand-audit-only',
    'charset' => 'utf8mb4', 'prefix' => 'test_', 'fields_strict' => true,
]]]);
$testApp->instance('db', $db);
$testApp->config->set(['default' => 'file', 'stores' => ['file' => ['type' => 'File', 'path' => sys_get_temp_dir() . '/brand-audit-cache/']]], 'cache');
think\Model::setDb($db);
use think\facade\Db;
$installSql = file_get_contents(dirname(__DIR__, 2) . '/crmeb/public/install/crmeb.sql');
foreach (['system_menus', 'system_role', 'store_category'] as $table) {
    preg_match('/CREATE TABLE IF NOT EXISTS `eb_' . $table . '`.*?;/s', $installSql, $match);
    Db::execute(str_replace('`eb_', '`test_', $match[0]));
}
Db::name('system_menus')->insert(['id' => 1, 'menu_path' => '/product', 'menu_name' => '商品', 'is_show_path' => 1, 'auth_type' => 1]);
$migration = file_get_contents(dirname(__DIR__, 2) . '/crmeb/upgrade/product_brands.sql');
$installer = file_get_contents(dirname(__DIR__, 2) . '/crmeb/public/install/index.php');
$splitStart = strpos($installer, 'function sql_split(');
eval(substr($installer, $splitStart, strpos($installer, 'function _dir_path(', $splitStart) - $splitStart));
$freshInstallStatements = sql_split(str_replace(';', ";\n", preg_replace('/\R/', ' ', $migration)), 'test_');
foreach ([1, 2] as $run) {
    $statements = $run === 1 ? $freshInstallStatements : explode(';', $migration);
    foreach ($statements as $sql) if (trim($sql)) Db::execute(trim(str_replace('`eb_', '`test_', $sql)));
}
checkBrand('migration idempotent, menu and 3 buttons + 5 APIs', Db::name('system_menus')->count() === 10);
checkBrand('all brand actions and APIs are available to role assignment', Db::name('system_menus')->where('id', '<>', 1)->where('is_show_path', 1)->count() === 9);
$brandInstaller = app\services\product\product\ProductBrandInstaller::class;
// Exercise a real upgrade without first running migration SQL (the reported failure).
foreach (['store_product_brand_cate', 'store_product_brand_relation', 'store_product_brand'] as $table) Db::execute('DROP TABLE test_' . $table);
Db::name('system_menus')->where('id', '<>', 1)->delete();
$menuService = $testApp->make(app\services\system\SystemMenusServices::class);
[$navigation, $permissions] = $menuService->getMenusList([], 0);
checkBrand('cold menu request installs brand navigation and all permissions', in_array('admin-product-brand-list', $permissions, true) && in_array('/admin/product/brand/list', array_column($navigation[0]['children'], 'path'), true));
$brandMenuId = (int)Db::name('system_menus')->where('unique_auth', 'admin-product-brand-list')->value('id');
foreach (['store_product_brand_cate', 'store_product_brand_relation'] as $table) {
    Db::execute('DROP TABLE test_' . $table);
    $service = new app\services\product\product\StoreProductBrandServices(new app\dao\product\product\StoreProductBrandDao());
    checkBrand('repair partial schema: ' . $table, $service->brandList([])['count'] === 0 && $service->productBrandIds(1) === []);
}
Db::name('system_menus')->where('id', $brandMenuId)->update(['pid' => 999, 'is_show' => 0, 'is_show_path' => 0, 'is_del' => 1, 'access' => 0]);
Db::name('system_menus')->where('unique_auth', 'product-brand-save-api')->delete();
// Historical installations can identify the product root by auth rather than path.
Db::name('system_menus')->where('id', 1)->update(['menu_path' => '', 'unique_auth' => 'admin-store-index']);
$brandInstaller::install();
$repairedMenu = Db::name('system_menus')->where('id', $brandMenuId)->find();
checkBrand('repair hidden, orphaned brand menu in place and missing API', (int)$repairedMenu['pid'] === 1 && !$repairedMenu['is_del'] && $repairedMenu['is_show'] && $repairedMenu['is_show_path'] && $repairedMenu['access'] && Db::name('system_menus')->count() === 10);
Db::name('system_menus')->where('id', 1)->update(['menu_path' => '/product']);
$brandInstaller::install();
checkBrand('repeated runtime install preserves menu IDs', (int)Db::name('system_menus')->where('unique_auth', 'admin-product-brand-list')->value('id') === $brandMenuId && Db::name('system_menus')->count() === 10);
Db::name('system_menus')->insert(['id' => 9000, 'pid' => 1, 'menu_path' => '/product/product_list', 'menu_name' => '商品管理', 'is_show_path' => 1, 'auth_type' => 1]);
Db::name('system_role')->insert(['id' => 1, 'rules' => '1,9000']);
[$restrictedMenus, $restrictedAuth] = $menuService->getMenusList([1], 1);
checkBrand('bootstrap does not grant brand management to product-only roles', !in_array('/admin/product/brand/list', array_column($restrictedMenus[0]['children'], 'path'), true) && !in_array('admin-product-brand-list', $restrictedAuth, true));
Db::name('system_menus')->where('id', 9000)->delete();
Db::execute('DROP TABLE test_store_product_brand_relation');
rejectBrand('missing schema inside transaction fails without an implicit commit', function () use ($brandInstaller) {
    Db::transaction(function () use ($brandInstaller) {
        Db::name('store_category')->insert(['id' => 99, 'cate_name' => 'must roll back']);
        $brandInstaller::ensureSchema();
    });
});
checkBrand('initialization guard preserves outer transaction rollback', Db::name('store_category')->where('id', 99)->count() === 0);
$brandInstaller::ensureSchema();
$roleTree = $testApp->make(app\services\system\SystemMenusServices::class)->getMenus([]);
$roleTreeIds = [];
$walkRoleTree = function ($items) use (&$walkRoleTree, &$roleTreeIds) {
    foreach ($items as $item) { $roleTreeIds[] = (int)$item['id']; $walkRoleTree($item['children'] ?? []); }
};
$walkRoleTree($roleTree);
$apiIds = array_map('intval', Db::name('system_menus')->where('auth_type', 2)->column('id'));
checkBrand('actual role tree exposes all five brand API permissions', count($apiIds) === 5 && !array_diff($apiIds, $roleTreeIds));
class BrandPermissionRoles {
    public $auth = [];
    public function getRolesByAuth($roles, $type) { return $this->auth; }
}
class BrandPermissionProbe extends app\adminapi\controller\v1\product\StoreProductBrand {
    public function __construct($level) { $this->adminInfo = ['level' => $level, 'roles' => [1]]; }
    public function permits($allowed) {
        try { $this->requirePermission($allowed); return true; }
        catch (crmeb\exceptions\AuthException $e) { return false; }
    }
}
$roleService = new BrandPermissionRoles;
$testApp->instance(app\services\system\admin\SystemRoleServices::class, $roleService);
$roleProbe = new BrandPermissionProbe(1);
checkBrand('unassigned role cannot manage brands', !$roleProbe->permits([['get', 'product/brand/list']]));
$roleService->auth = ['get' => ['product/brand/list']];
checkBrand('assigned list permission allows list only', $roleProbe->permits([['get', 'product/brand/list']]) && !$roleProbe->permits([['post', 'product/brand/save/<id>']]));
$roleService->auth = ['get' => ['product/product/<id>']];
checkBrand('product editor can read candidates without brand management permission', $roleProbe->permits([['get', 'product/product/<id>'], ['get', 'product/brand/list']]) && !$roleProbe->permits([['get', 'product/brand/list']]));
checkBrand('root admin can manage brands', (new BrandPermissionProbe(0))->permits([['post', 'product/brand/save/<id>']]));
Db::name('store_category')->insertAll([
    ['id' => 1, 'pid' => 0, 'cate_name' => '电器'], ['id' => 2, 'pid' => 1, 'cate_name' => '厨房'],
    ['id' => 3, 'pid' => 2, 'cate_name' => '水壶'], ['id' => 4, 'pid' => 1, 'cate_name' => '空调'],
    ['id' => 5, 'pid' => 0, 'cate_name' => '服装']
]);
$brands = $testApp->make(app\services\product\product\StoreProductBrandServices::class);
$data = ['name' => '通用品牌', 'logo' => '', 'description' => '', 'sort' => 10, 'status' => 1, 'is_global' => 1, 'cate_ids' => []];
$global = $brands->saveBrand(0, $data);
$parent = $brands->saveBrand(0, array_replace($data, ['name' => '电器品牌', 'is_global' => 0, 'cate_ids' => [1]]));
$leaf = $brands->saveBrand(0, array_replace($data, ['name' => '水壶品牌', 'is_global' => 0, 'cate_ids' => [3]]));
$multi = $brands->saveBrand(0, array_replace($data, ['name' => '多分类品牌', 'is_global' => 0, 'cate_ids' => [2, 5, 5]]));
checkBrand('multi category persisted without duplicates', $brands->brandInfo($multi)['cate_ids'] === [2, 5]);
rejectBrand('duplicate name rejected', function () use ($brands, $data) { $brands->saveBrand(0, $data); });
rejectBrand('blank name rejected', function () use ($brands, $data) { $brands->saveBrand(0, array_replace($data, ['name' => '  '])); });
rejectBrand('restricted brand requires categories', function () use ($brands, $data) { $brands->saveBrand(0, array_replace($data, ['name' => '无分类', 'is_global' => 0])); });
rejectBrand('missing category rejected', function () use ($brands, $data) { $brands->saveBrand(0, array_replace($data, ['name' => '错误分类', 'is_global' => 0, 'cate_ids' => [999]])); });
checkBrand('no category exposes global only', array_column($brands->options([]), 'id') === [$global]);
checkBrand('leaf gets matching ancestors and global', count($brands->options([3])) === 4);
checkBrand('unrelated sibling does not receive leaf brands', array_column($brands->options([4]), 'id') === [$parent, $global]);
checkBrand('multiple selected product categories match union', count($brands->options([4, 5])) === 3);
$brands->transaction(function () use ($brands, $global, $leaf) { $brands->syncProductBrands(10, [$global, $leaf, $leaf], [3]); });
checkBrand('product multiple brands saved and read', $brands->productBrandIds(10) === [$global, $leaf]);
checkBrand('brand usage count', $brands->brandInfo($leaf)['product_count'] === 1);
rejectBrand('cannot delete referenced brand', function () use ($brands, $leaf) { $brands->deleteBrand($leaf); });
rejectBrand('mismatching category rejected', function () use ($brands, $leaf) { $brands->transaction(function () use ($brands, $leaf) { $brands->syncProductBrands(10, [$leaf], [4]); }); });
checkBrand('failed selection leaves existing relations', $brands->productBrandIds(10) === [$global, $leaf]);
$brands->setBrandStatus($leaf, 0);
$options = array_column($brands->options([3], [$leaf]), null, 'id');
checkBrand('disabled selected brand retained as unavailable', isset($options[$leaf]) && $options[$leaf]['available'] === false);
rejectBrand('disabled brand rejected by save', function () use ($brands, $leaf) { $brands->transaction(function () use ($brands, $leaf) { $brands->syncProductBrands(11, [$leaf], [3]); }); });
rejectBrand('unknown brand rejected by save', function () use ($brands) { $brands->transaction(function () use ($brands) { $brands->syncProductBrands(11, [999], [3]); }); });
try {
    $brands->transaction(function () use ($brands, $global) { $brands->syncProductBrands(10, [$global], [3]); throw new RuntimeException('simulate product save failure'); });
} catch (RuntimeException $e) {}
checkBrand('outer transaction failure rolls back relation replacement', $brands->productBrandIds(10) === [$global, $leaf]);
$brands->transaction(function () use ($brands) { $brands->syncProductBrands(10, [], [3]); });
checkBrand('empty selection clears relations', $brands->productBrandIds(10) === []);
$brands->deleteBrand($leaf);
checkBrand('unreferenced brand and its category links removed', Db::name('store_product_brand_cate')->where('brand_id', $leaf)->count() === 0);
$brands->saveBrand($multi, array_replace($data, ['name' => '多分类品牌', 'is_global' => 1, 'cate_ids' => [2, 5]]));
checkBrand('switch to global clears scope links', $brands->brandInfo($multi)['cate_ids'] === []);
checkBrand('list category filter includes globals and ancestors', $brands->brandList(['cate_id' => 4])['count'] === 3);
echo "All brand database regressions passed.\n";
