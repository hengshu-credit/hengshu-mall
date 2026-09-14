<?php
/** Real MySQL product publication checks. This suite never loads the installed .env. */
require dirname(__DIR__, 2) . '/crmeb/vendor/autoload.php';
if (getenv('CRMEB_QUALITY_DATABASE') !== 'crmeb_quality_test') throw new RuntimeException('Requires isolated crmeb_quality_test');
$port = (int)(getenv('CRMEB_QUALITY_PORT') ?: 33316);
$pdo = new PDO('mysql:host=127.0.0.1;port=' . $port . ';charset=utf8mb4', 'root', 'audit-only-password', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$pdo->exec('CREATE DATABASE IF NOT EXISTS crmeb_quality_test CHARACTER SET utf8mb4');
$qualityApp = new think\App(dirname(__DIR__, 2) . '/crmeb/');
$qualityApp->setRuntimePath(sys_get_temp_dir() . '/crmeb-quality-' . getmypid() . '/');
think\Container::setInstance($qualityApp);
function app($name = null) { global $qualityApp; return $name === null ? $qualityApp : $qualityApp->make($name); }
function getLang($message, $replace = []) { return $message; }
function sys_config($name, $default = null) { return $default; }
$db = new think\DbManager;
$db->setConfig(['default' => 'mysql', 'connections' => ['mysql' => ['type' => 'mysql', 'hostname' => '127.0.0.1', 'hostport' => $port, 'database' => 'crmeb_quality_test', 'username' => 'root', 'password' => 'audit-only-password', 'charset' => 'utf8mb4', 'prefix' => 'eb_', 'fields_strict' => true]]]);
$qualityApp->instance('db', $db); think\Model::setDb($db);
use think\facade\Db;
use app\services\product\product\ProductQualityServices;
function qualityCheck($condition, $name) { if (!$condition) throw new RuntimeException('FAIL: ' . $name); echo 'PASS: ' . $name . PHP_EOL; }
function qualityReject(callable $fn, $name) { try { $fn(); } catch (crmeb\exceptions\AdminException $e) { qualityCheck(true, $name); return; } throw new RuntimeException('FAIL: ' . $name); }
qualityCheck(class_exists(ProductQualityServices::class), 'quality publication gate exists');
$schema = file_get_contents(dirname(__DIR__, 2) . '/crmeb/public/install/crmeb.sql');
foreach (['store_product', 'store_product_attr_value', 'store_product_description', 'store_product_cate', 'store_cart', 'shipping_templates', 'system_admin'] as $table) {
    if (!preg_match('/CREATE TABLE IF NOT EXISTS `eb_' . $table . '`.*?;/s', $schema, $match)) throw new RuntimeException('Missing schema ' . $table);
    Db::execute($match[0]);
}
app\services\product\product\ProductQualityInstaller::install();
foreach (['store_product_quality', 'store_product_quality_history', 'store_product_attr_value', 'store_product_description', 'store_product_cate', 'store_cart', 'store_product', 'system_admin'] as $table) Db::name($table)->where('1=1')->delete();
Db::name('system_admin')->insert(['id' => 17, 'account' => 'quality-test', 'pwd' => '', 'real_name' => '测试审核员', 'status' => 1]);
function qualityFixture($id, array $changes = []) {
    Db::name('store_product')->insert(array_replace(['id' => $id, 'store_name' => '测试商品', 'cate_id' => '1', 'unit_name' => '件', 'price' => '19.90', 'ot_price' => '29.90', 'stock' => 5, 'image' => '/uploads/test.jpg', 'slider_image' => '["/uploads/test.jpg"]', 'is_show' => 0, 'freight' => 2, 'postage' => '0.00', 'logistics' => '1', 'soure_link' => 'https://item.jd.com/123.html'], $changes));
    Db::name('store_product_attr_value')->insert(['product_id' => $id, 'suk' => '默认', 'unique' => sprintf('%08d', $id), 'price' => '19.90', 'ot_price' => '29.90', 'stock' => 5, 'image' => '/uploads/test.jpg']);
    Db::name('store_product_description')->insert(['product_id' => $id, 'description' => '<p>测试商品详情</p>', 'type' => 0]);
}
function qualityInput() { return ['source_note' => '供应商原始资料', 'shipping_origin' => '上海仓', 'sales_subject' => '测试商城有限公司', 'after_sales_subject' => '测试商城售后', 'service_note' => '按商品页面退换承诺办理', 'promotion_note' => '图片无过期促销信息', 'confirm' => true, 'checks' => ['price', 'crossed_price', 'media', 'sku', 'stock', 'shipping', 'responsibility', 'service'], 'reviewer_id' => 999]; }
$quality = new ProductQualityServices;
qualityFixture(1);
qualityReject(function () use ($quality) { Db::transaction(function () use ($quality) { $quality->assertPublish(1); }); }, 'unreviewed complete product cannot publish');
$quality->save(1, null, 0);
qualityCheck($quality->get(1)['status'] === 'pending', 'unreviewed draft persists without approval');
qualityReject(function () use ($quality) { $quality->save(1, qualityInput(), 0); }, 'client reviewer id cannot replace authenticated actor');
$missing = qualityInput(); $missing['checks'] = ['price'];
qualityReject(function () use ($quality, $missing) { $quality->save(1, $missing, 17); }, 'all checklist categories require explicit confirmation');
$missing = qualityInput(); $missing['after_sales_subject'] = '';
qualityReject(function () use ($quality, $missing) { $quality->save(1, $missing, 17); }, 'missing after-sales responsibility blocks review');
$quality->save(1, qualityInput(), 17);
$review = $quality->get(1);
qualityCheck($review['status'] === 'approved' && $review['reviewer_id'] === 17, 'approved review records the server actor');
qualityCheck(Db::name('store_product_quality_history')->where('product_id', 1)->count() === 1, 'successful review appends one auditable record');
$history=json_decode(Db::name('store_product_quality_history')->where('product_id',1)->value('snapshot'),true);
qualityCheck($history['product']['soure_link']==='https://item.jd.com/123.html','review history retains original source');
Db::transaction(function () use ($quality) { $quality->assertPublish(1); });
qualityCheck(true, 'reviewed current product can publish');
Db::name('store_product_attr_value')->where('product_id', 1)->update(['price' => '21.00']);
qualityReject(function () use ($quality) { $quality->assertPublish(1); }, 'changed SKU price invalidates prior review');
Db::name('store_product_attr_value')->where('product_id', 1)->update(['price' => '19.90', 'stock' => 4]);
$quality->assertPublish(1);
qualityCheck(true, 'ordinary stock deduction does not invalidate business review');
Db::name('store_product_attr_value')->where('product_id', 1)->update(['stock' => 0]);
qualityReject(function () use ($quality) { $quality->assertPublish(1); }, 'no sellable stock prevents re-publish');
qualityFixture(2, ['is_show' => 1]);
qualityCheck((int)Db::name('store_product')->where('id', 2)->value('is_show') === 1 && $quality->get(2)['status'] === 'pending', 'legacy listed goods remain listed and visibly need review');
foreach ([['price' => '0.00'], ['ot_price' => '1.00'], ['suk' => ''], ['image' => ''], ['is_show' => 0]] as $i => $change) {
    qualityFixture(10 + $i);
    Db::name('store_product_attr_value')->where('product_id', 10 + $i)->update($change);
    qualityReject(function () use ($quality, $i) { $quality->save(10 + $i, qualityInput(), 17); }, 'invalid SKU case ' . $i . ' cannot be approved');
}
foreach ([['image' => ''], ['slider_image' => '[]'], ['freight' => 3, 'temp_id' => 987654], ['logistics' => ''], ['video_link' => 'https://vod.360buyimg.com/test.mp4']] as $i => $change) {
    qualityFixture(20 + $i, $change);
    qualityReject(function () use ($quality, $i) { $quality->save(20 + $i, qualityInput(), 17); }, 'missing media/shipping case ' . $i . ' cannot be approved');
}
qualityFixture(30, ['soure_link' => '']);
$manual = qualityInput(); $manual['source_note'] = '';
qualityReject(function () use ($quality, $manual) { $quality->save(30, $manual, 17); }, 'missing source url and source note blocks review');
$manual['source_note'] = '供应商纸质报价单 2026-09-14';
$quality->save(30, $manual, 17);
qualityCheck($quality->get(30)['status'] === 'approved', 'manual source notes support non-collected products');
qualityFixture(31, ['virtual_type' => 1, 'logistics' => '']);
$virtual = qualityInput(); $virtual['shipping_origin'] = '';
$quality->save(31, $virtual, 17);
qualityCheck($quality->get(31)['status'] === 'approved', 'virtual goods do not require a physical shipping origin');
echo 'Product quality database checks passed.' . PHP_EOL;
