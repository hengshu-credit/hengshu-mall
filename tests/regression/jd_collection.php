<?php
// Real adapters with isolated transport/config/cache boundaries. No DB or JD access.
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
function getLang($text, $replace = []) { return $text; }
$settings = ['jd_crawler_enabled' => 1, 'jd_crawler_url' => 'http://jd-crawler:8091', 'jd_crawler_token' => str_repeat('a', 32)];
function sys_config($key, $default = null) { global $settings; return $settings[$key] ?? $default; }
class JdTestCache {
    public static $items = [];
    public static function set($key, $value, $expire = 0, $tag = '') { self::$items[$key] = $value; return true; }
    public static function get($key, $default = '') { return self::$items[$key] ?? $default; }
}
class_alias(JdTestCache::class, 'crmeb\\services\\CacheService');
function checkJd($label, $ok) { if (!$ok) throw new RuntimeException('FAIL: ' . $label); echo 'PASS: ' . $label . "\n"; }
function rejectJd($label, callable $call) {
    try { $call(); } catch (crmeb\exceptions\AdminException $e) { checkJd($label, true); return; }
    checkJd($label, false);
}
checkJd('JD adapter exists', class_exists(app\services\product\product\JdCrawlerServices::class));
$service = new app\services\product\product\JdCrawlerServices();
foreach (['https://item.jd.com/1000123.html?from=fixture', 'http://item.m.jd.com/product/1000123.html'] as $url) {
    checkJd('canonical JD URL', $service->canonicalUrl($url) === 'https://item.jd.com/1000123.html');
}
foreach (['https://item.jd.com.evil.test/123.html', 'http://127.0.0.1/123.html', 'ftp://item.jd.com/123.html', 'https://u:p@item.jd.com/123.html', 'https://item.jd.com:8888/123.html', "https://item.jd.com/123.html\r\nX:1", 'https://item.jd.com/../123.html'] as $url) {
    rejectJd('reject unsafe URL', function () use ($service, $url) { $service->canonicalUrl($url); });
}
$raw = ['sku_id' => '1000123', 'source_url' => 'https://item.jd.com/1000123.html', 'title' => '测试商品 <b>蓝色</b>', 'price' => 129.5,
    'images' => ['https://img10.360buyimg.com/n1/jfs/test.jpg'], 'detail_images' => ['https://img10.360buyimg.com/imgzone/jfs/detail.jpg'],
    'attributes' => [['name' => '<script>x</script>', 'value' => '参数 & "值"']], 'selected_specs' => [['name' => '颜色', 'value' => '蓝色']],
    'stock' => 999, 'sales' => 9999, 'original_price' => 800, 'warnings' => []];
$mapped = $service->mapProduct($raw);
checkJd('real price retained, no invented stock/sales/original price', $mapped['price'] === 129.5 && $mapped['stock'] === 0 && $mapped['sales'] === 0 && $mapped['ot_price'] === 0);
checkJd('single current SKU, editable attribute', $mapped['spec_type'] === 0 && $mapped['attr']['price'] === 129.5 && $mapped['attr']['stock'] === 0);
checkJd('material and source preserved', count($mapped['slider_image']) === 1 && $mapped['soure_link'] === $raw['source_url']);
checkJd('description escapes untrusted parameters', strpos($mapped['description'], '<script>') === false && strpos($mapped['description'], '&amp;') !== false);
checkJd('selected specifications become parameters', $mapped['params_list'][1]['value'] === '蓝色');
$media = $raw;
$media['images'] = ['https://img10.360buyimg.com/n1/jfs/test.jpg.avif'];
$media['video_link'] = 'https://jdvideo.jd.com/fixture/product.mp4?token=test';
$mediaForm = $service->mapProduct($media);
checkJd('native AVIF and video enter the product editor intact', $mediaForm['slider_image'] === $media['images'] && $mediaForm['video_link'] === $media['video_link'] && $mediaForm['video_open'] === 1);
checkJd('missing video clears previous editor video', $mapped['video_link'] === '' && $mapped['video_open'] === 0);
foreach (['https://evil.test/movie.mp4', 'https://jdvideo.jd.com/movie.m3u8', 'javascript:alert(1)'] as $video) {
    rejectJd('reject invalid collected video', function () use ($service, $raw, $video) { $service->mapProduct(array_merge($raw, ['video_link' => $video])); });
}
$unknown = $raw; $unknown['price'] = null;
checkJd('missing price produces warning', count($service->mapProduct($unknown)['collection_warnings']) > 0);
foreach ([array_merge($raw, ['title' => '']), array_merge($raw, ['images' => []]), array_merge($raw, ['images' => ['http://127.0.0.1/private']]), array_merge($raw, ['price' => -1])] as $bad) {
    rejectJd('reject incomplete or unsafe material', function () use ($service, $bad) { $service->mapProduct($bad); });
}
class JdTransportSpy extends app\services\product\product\JdCrawlerServices {
    public $reply = []; public $calls = [];
    protected function request(string $method, string $path, array $body = []): array { $this->calls[] = [$method, $path, $body]; return $this->reply; }
}
$client = new JdTransportSpy();
$id = '11111111-2222-4333-8444-555555555555';
$client->reply = ['job_id' => $id, 'state' => 'queued'];
checkJd('task creation returns polling handle', $client->start($raw['source_url'], 8)['task_id'] === $id);
rejectJd('other administrator cannot access task', function () use ($client, $id) { $client->poll($id, 9); });
checkJd('ownership check precedes network access', count($client->calls) === 1);
$client->reply = ['job_id' => $id, 'state' => 'running'];
checkJd('pending state retained', $client->poll($id, 8)['state'] === 'running');
$client->reply = ['job_id' => $id, 'state' => 'succeeded', 'product' => $raw];
checkJd('complete task yields real product', $client->poll($id, 8)['product']['sku_id'] === '1000123');
$client->reply['product']['sku_id'] = '999';
rejectJd('mismatched SKU rejected', function () use ($client, $id) { $client->poll($id, 8); });
$client->reply = ['job_id' => $id, 'state' => 'failed', 'error' => ['code' => 'login_required', 'message' => 'secret internal data']];
try { $client->poll($id, 8); checkJd('failure should throw', false); } catch (crmeb\exceptions\AdminException $e) {
    checkJd('login failure actionable without leaking upstream message', strpos($e->getMessage(), '登录') !== false && strpos($e->getMessage(), 'secret') === false);
}
$config = new app\services\system\config\JdCrawlerConfig();
checkJd('existing JD installations select local provider without losing settings', $config->provider() === 3);
$tabs = $config->tabs([['id' => 89, 'value' => 89, 'label' => '基础配置', 'pid' => 41], ['id' => 90, 'value' => 90, 'label' => '99api配置', 'pid' => 41]], 89);
checkJd('local JD settings have a separate sibling tab', count($tabs) === 3 && $tabs[1]['value'] === $config::TAB_ID);
checkJd('other configuration pages do not gain JD tabs', count($config->tabs([['id' => 2, 'value' => 2]], 89)) === 1);
$providerRule = json_decode(json_encode($config->providerRule(new crmeb\services\FormBuilder())), true);
checkJd('basic collection provider offers local JD', $providerRule['value'] === 3 && $providerRule['options'][2]['value'] === 3);
$settings['jd_crawler_enabled'] = 0;
$settings['system_product_copy_type'] = 3;
checkJd('selected local provider enables JD collection', $config::enabled());
$settings['jd_crawler_enabled'] = 1;
$settings['system_product_copy_type'] = 1;
$post = $config->validate(['jd_crawler_enabled' => 1, 'jd_crawler_url' => 'http://jd-crawler:8091/', 'jd_crawler_token' => '']);
checkJd('blank secret keeps current key', !isset($post['jd_crawler_token']) && $post['jd_crawler_url'] === 'http://jd-crawler:8091');
rejectJd('unsafe configuration rejected', function () use ($config) { $config->validate(['jd_crawler_url' => 'file:///etc/passwd']); });
rejectJd('short secret rejected', function () use ($config) { $config->validate(['jd_crawler_token' => 'weak']); });
$container = new class {
    public $instances = [];
    public function make($name) { return $this->instances[$name]; }
};
function app($name = null) { global $container; return $name === null ? $container : $container->make($name); }
$container->instances[app\services\product\product\StoreProductServices::class] = new class {
    public function getTemp() { return [['id' => 1]]; }
};
$container->instances[app\services\product\product\StoreCategoryServices::class] = new class {
    public function getTierList($enabled) { return []; }
};
$copy = new app\services\product\product\CopyTaobaoServices();
checkJd('HTML detail image decoding restores the exact source query', $copy->descriptionImageUrl('https://img30.360buyimg.com/sku/jfs/native.jpg.avif?size=1&amp;sign=a%2Bb') === 'https://img30.360buyimg.com/sku/jfs/native.jpg.avif?size=1&sign=a%2Bb');
function make_path($path, $type, $create) { return 'attach/fixture'; }
$categorySpy = new class {
    public $query;
    public function getOne($where) { $this->query = $where; return ['id' => 17]; }
};
$attachmentSpy = new class {
    public $record;
    public function save($data) { $this->record = $data; return true; }
};
$container->instances[app\services\system\attachment\SystemAttachmentCategoryServices::class] = $categorySpy;
$container->instances[app\services\system\attachment\SystemAttachmentServices::class] = $attachmentSpy;
class JdMediaStorageProbe extends app\services\product\product\CopyTaobaoServices {
    public function downloadImage($url = '', $name = '', $type = 0, $timeout = 30, $w = 0, $h = 0) {
        return ['path' => '/uploads/fixture.webm', 'name' => 'fixture.webm', 'size' => 200, 'mime' => 'video/webm', 'image_type' => 1, 'is_exists' => false];
    }
}
$storedVideo = (new JdMediaStorageProbe())->downloadCopyVideo('https://jdvideo.jd.com/product.webm');
checkJd('collected video enters the video material category with correct MIME', $storedVideo === '/uploads/fixture.webm' && $attachmentSpy->record['type'] === 1 && $attachmentSpy->record['att_type'] === 'video/webm' && $categorySpy->query['type'] === 1);
$form = $copy->productForm($mapped)['productInfo'];
checkJd('common form defaults preserve JD specification and params', $form['spec_type'] === 0 && count($form['params_list']) === 2 && $form['attr']['stock'] === 0 && $form['is_show'] === 0);
$legacy = $mapped; unset($legacy['spec_type'], $legacy['params_list']);
$legacy['items'] = [['value' => '颜色', 'detail' => ['蓝色']]];
$legacy['info']['value'] = [['detail' => ['颜色' => '蓝色'], 'price' => 10]];
$legacyForm = $copy->productForm($legacy)['productInfo'];
checkJd('legacy multi-spec collection preserved', $legacyForm['spec_type'] === 1 && $legacyForm['items'][0]['detail'][0]['value'] === '蓝色' && $legacyForm['attrs'][0]['attr_arr'][0] === '蓝色');
$legacyProvider = new class {
    public $result;
    public $calls = 0;
    public function copy($name) { return $this; }
    public function goods($url, $options = []) { $this->calls++; return $this->result; }
};
$container->instances[app\services\serve\ServeServices::class] = $legacyProvider;
$settings['system_product_copy_type'] = 2; $settings['copy_product_apikey'] = 'fixture-only';
$legacyProvider->result = ['status' => true, 'msg' => 'SUCCESS', 'data' => $legacy];
checkJd('99API boolean success contract still works', $copy->copyProduct('taobao', '', '', 'https://item.taobao.com/item.htm?id=123')['productInfo']['spec_type'] === 1);
$legacyProvider->result = ['status' => false, 'msg' => 'synthetic failure'];
rejectJd('99API failure is still rejected', function () use ($copy) { $copy->copyProduct('taobao', '', '', 'https://item.taobao.com/item.htm?id=123'); });
$formRules = json_decode(json_encode($config->rules(new crmeb\services\FormBuilder())), true);
checkJd('separate JD tab contains connection fields and a blank password', count($formRules) === 2 && $formRules[1]['value'] === '' && $formRules[1]['props']['type'] === 'password');
$container->instances['json'] = new class {
    public function success($data = '') { return ['status' => 200, 'data' => $data]; }
    public function fail($msg) { return ['status' => 400, 'msg' => $msg]; }
};
class JdInput extends app\Request {
    private $testInput;
    public function __construct(array $input) { $this->testInput = $input; }
    public function postMore(array $params, bool $suffix = false, bool $filter = true): array {
        $values = [];
        foreach ($params as $param) { $key = is_array($param[0]) ? $param[0][0] : $param[0]; $values[$key] = $this->testInput[$key] ?? $param[1]; }
        return $suffix ? array_values($values) : $values;
    }
}
class JdSaveController extends app\adminapi\controller\v1\product\StoreProduct {
    public function __construct(array $input, $service) { $this->request = new JdInput($input); $this->service = $service; }
}
$saveSpy = new class {
    public $data;
    public $result;
    public function save($id, $data) { $this->data = $data; return $this->result; }
};
(new JdSaveController(['soure_link' => $raw['source_url'], 'type' => -1], $saveSpy))->save(0);
checkJd('normal product save receives source URL and collection material flag', $saveSpy->data['soure_link'] === $raw['source_url'] && $saveSpy->data['type'] === -1);
$saveSpy->result = ['collection_warnings' => ['京东视频转存失败，商品已保存']];
checkJd('saved product returns nonfatal media warning without asking for duplicate save', (new JdSaveController([], $saveSpy))->save(0)['data'] === $saveSpy->result);
(new JdSaveController([], $saveSpy))->save(5);
checkJd('older clients do not erase saved source URL', !array_key_exists('soure_link', $saveSpy->data));
checkJd('invalid source rejected before saving', (new JdSaveController(['soure_link' => 'javascript:alert(1)'], $saveSpy))->save(0)['status'] === 400);
class JdCopyController extends app\adminapi\controller\v1\product\CopyTaobao {
    public function __construct(array $input, $service) { $this->request = new JdInput($input); $this->services = $service; $this->adminId = 8; }
}
$reportedUrl = 'https://item.jd.com/100278221408.html?pcdk=fixture&spmTag=tracking%23fixture';
$container->instances[app\services\product\product\JdCrawlerServices::class] = $service;
$savedSettings = $settings;
$legacyCalls = $legacyProvider->calls;
foreach ([
    ['jd_crawler_enabled' => 0],
    ['jd_crawler_enabled' => 1, 'jd_crawler_token' => ''],
] as $missingConfig) {
    $settings = array_merge($savedSettings, $missingConfig);
    try {
        (new JdCopyController(['type' => 'taobao', 'url' => $reportedUrl], $copy))->copyProduct();
        checkJd('missing JD configuration should throw', false);
    } catch (crmeb\exceptions\AdminException $e) {
        $expected = $settings['jd_crawler_enabled'] ? '访问密钥' : '启用京东独立采集';
        checkJd('JD configuration failure is actionable without legacy token access', strpos($e->getMessage(), $expected) !== false && $legacyProvider->calls === $legacyCalls);
    }
}
$settings = $savedSettings;
$container->instances[app\services\product\product\JdCrawlerServices::class] = $client;
$client->reply = ['job_id' => $id, 'state' => 'queued'];
$response = (new JdCopyController(['type' => 'taobao', 'url' => $reportedUrl], $copy))->copyProduct();
checkJd('tracked JD link routes by host and strips tracking before collection', $response['data']['task_id'] === $id && end($client->calls)[2]['url'] === 'https://item.jd.com/100278221408.html' && $legacyProvider->calls === $legacyCalls);
$legacyProvider->result = ['status' => true, 'data' => $legacy];
$response = (new JdCopyController(['url' => 'https://item.taobao.com/item.htm?id=123'], $copy))->copyProduct();
checkJd('local JD provider rejects other platforms without paid token access', $response['status'] === 400 && $legacyProvider->calls === $legacyCalls);
$settings['jd_crawler_enabled'] = 0;
$response = (new JdCopyController(['type' => 'taobao', 'url' => 'https://item.taobao.com/item.htm?id=123'], $copy))->copyProduct();
checkJd('other platforms still use configured legacy collection', $response['data']['productInfo']['spec_type'] === 1 && $legacyProvider->calls === $legacyCalls + 1);
$settings['jd_crawler_enabled'] = 1;
$response = (new JdCopyController(['url' => $raw['source_url']], $copy))->copyProduct();
checkJd('existing controller starts JD job without paid provider', $response['data']['task_id'] === $id);
$client->reply = ['job_id' => $id, 'state' => 'succeeded', 'product' => $raw];
$response = (new JdCopyController(['task_id' => $id], $copy))->copyProduct();
checkJd('existing controller returns editable productInfo after poll', $response['data']['productInfo']['store_name'] === $mapped['store_name']);
$productSpy = new class {
    public $video = 'https://jdvideo.jd.com/product.webm';
    public $updates = [];
    public function value($where, $field) { return $this->video; }
    public function update($where, $data) { $this->updates[] = [$where, $data]; return 1; }
};
$videoSpy = new class {
    public $calls = 0;
    public $fail = false;
    public function downloadCopyVideo($url) { $this->calls++; if ($this->fail) throw new RuntimeException('private transport failure'); return '/uploads/original.webm'; }
};
$container->instances[app\services\product\product\StoreProductServices::class] = $productSpy;
$container->instances[app\services\product\product\CopyTaobaoServices::class] = $videoSpy;
$videoJob = new app\jobs\ProductCopyJob();
$videoUrl = 'https://jdvideo.jd.com/product.webm';
checkJd('video job replaces original URL with stored media', $videoJob->copyVideo(7, hash('sha256', $videoUrl)) === true && $productSpy->updates[0] === [['id' => 7, 'video_link' => $videoUrl], ['video_link' => '/uploads/original.webm']]);
$productSpy->video = '/uploads/manual.webm';
$videoJob->copyVideo(7, hash('sha256', $videoUrl));
checkJd('video job preserves later manual edits', $videoSpy->calls === 1 && count($productSpy->updates) === 1);
class JdVideoPublishProbe extends app\services\product\product\JdVideoImportServices {
    public $arguments;
    public $result = false;
    protected function publish(int $id, string $hash) { $this->arguments = [$id, $hash]; return $this->result; }
}
$imports = new JdVideoPublishProbe();
$signedVideo = 'https://jdvideo.jd.com/product.webm?token=private-signature';
$warnings = $imports->schedule(8, $signedVideo);
checkJd('queue rejection is reported after product save', count($warnings) === 1 && strpos($warnings[0], '失败') !== false);
checkJd('queue arguments never contain signed media URLs', $imports->arguments === [8, hash('sha256', $signedVideo)]);
checkJd('unfinished video warning survives missing status cache', count($imports->warnings(999, $signedVideo)) === 1);
checkJd('stored media has no pending import warning', $imports->warnings(8, '/uploads/original.webm') === []);
$imports->result = 'job-id';
checkJd('queued transfer is shown as unfinished', strpos($imports->schedule(9, $signedVideo)[0], '正在') !== false);
class JdVideoLogProbe { public static $message; public static function error($message) { self::$message = $message; } }
class_alias(JdVideoLogProbe::class, 'think\\facade\\Log');
$videoSpy->fail = true; $productSpy->video = $signedVideo;
checkJd('download failure remains visible after queue retries finish', $videoJob->copyVideo(10, hash('sha256', $signedVideo)) === false && strpos($imports->warnings(10, $signedVideo)[0], '失败') !== false);
checkJd('video download logs exclude URL signatures and transport details', strpos(JdVideoLogProbe::$message, 'private') === false && strpos(JdVideoLogProbe::$message, $signedVideo) === false);
if (isset($argv[1])) {
    require $root . '/vendor/symfony/polyfill-intl-idn/bootstrap.php';
    foreach (['guzzle', 'promises', 'psr7'] as $package) require $root . '/vendor/guzzlehttp/' . $package . '/src/functions_include.php';
    $settings['jd_crawler_url'] = $argv[1];
    $settings['jd_crawler_token'] = str_repeat('t', 32);
    $remote = new app\services\product\product\JdCrawlerServices();
    $task = $remote->start($raw['source_url'], 77);
    $done = $remote->poll($task['task_id'], 77);
    checkJd('real HTTP authenticated create and poll', $done['product']['sku_id'] === '1000123');
}
echo "JD collection PHP checks passed\n";
