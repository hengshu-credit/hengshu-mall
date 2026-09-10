<?php
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
function getLang($value, $replace = []) { return $value; }
function categoryCheck($label, $value) { if (!$value) throw new RuntimeException($label); echo "PASS: $label\n"; }
use app\services\diy\CategoryPageConfig;
foreach ([1, '2', '3'] as $old) categoryCheck('legacy category layout remains readable', CategoryPageConfig::read($old)['status'] === (int)$old);
categoryCheck('style 2 preserves original large-image presentation', CategoryPageConfig::read('2')['product_layout'] === 'large');
categoryCheck('style 3 preserves original image/text list', CategoryPageConfig::read('3')['product_layout'] === 'list');
foreach ([1, 2, 3] as $layout) {
    $custom = CategoryPageConfig::validate(['status' => $layout, 'price_color' => '#123456', 'image_radius' => 24, 'buy_button_style' => 8]);
    categoryCheck('all three original styles support decoration', CategoryPageConfig::read(json_encode($custom)) === $custom);
}
$config = CategoryPageConfig::validate(['status' => 1, 'columns' => 4, 'show_search' => 0,
    'show_title' => 0, 'page_title' => '精选分类', 'title_hidden' => 1, 'category_hidden' => 1,
    'search_placeholder' => '搜索好物', 'image_fit' => 'contain', 'image_radius' => 8,
    'banner_enabled' => 1, 'banner_image' => '/uploads/category.webp', 'banner_link' => '/pages/goods/goods_list/index?cid=1']);
categoryCheck('category settings survive serialization', CategoryPageConfig::read(json_encode($config)) === $config);
foreach ([['status' => 9], ['columns' => 8], ['banner_image' => 'javascript:alert(1)'], ['banner_link' => '//evil.test'], ['background_color' => 'url(https://evil.test)']] as $invalid) {
    try { CategoryPageConfig::validate($invalid); throw new RuntimeException('invalid configuration accepted'); }
    catch (crmeb\exceptions\AdminException $e) { categoryCheck('unsafe category configuration rejected', true); }
}
class CategoryThemeProbe extends app\services\diy\ThemeServices {
    public function __construct($dao) { $this->dao = $dao; }
}
$dao = new class {
    public $saved = [];
    public function value($where, $field) { return 0; }
    public function update($id, $data) { $this->saved = $data; }
    public function get($id) { return new class($this->saved) {
        private $data;
        public function __construct($data) { $this->data = $data; }
        public function toArray() { return $this->data; }
    }; }
};
$service = new CategoryThemeProbe($dao);
$service->saveTheme(17, ['tid' => 0, 'title' => '', 'type' => 'category', 'value' => $config]);
categoryCheck('theme save stores complete category configuration', json_decode($dao->saved['category_data'], true) === $config);
categoryCheck('cover path uses layout number rather than JSON', $dao->saved['category_image'] === '/statics/images/cate1.png');
categoryCheck('theme API returns compatible status plus decoration settings', $service->getThemeInfo(17, 'category') === $config);
