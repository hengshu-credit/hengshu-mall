<?php
error_reporting(E_ALL);
$root = dirname(__DIR__, 2) . '/crmeb';
$prefixes = require $root . '/vendor/composer/autoload_psr4.php';
spl_autoload_register(function ($class) use ($prefixes) {
    foreach ($prefixes as $prefix => $dirs) if (strpos($class, $prefix) === 0) foreach ($dirs as $dir) {
        $file = $dir . '/' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
        if (is_file($file)) { require $file; return; }
    }
});
function getLang($value, $replace = []) { return $value; }
function navCheck($condition, $message) { if (!$condition) throw new RuntimeException($message); echo "PASS: $message\n"; }
use app\services\diy\MainNavigationConfig;
$home = ['title' => '首页', 'value' => ['banner' => ['name' => 'banner', 'data' => ['keep']], 'footer' => [
    'name' => 'pageFoot', 'menuList' => [['name' => '首页', 'link' => '/pages/index/index', 'imgList' => ['/selected.svg', '/normal.svg']]],
    'effectConfig' => ['tabVal' => 1], 'navConfig' => ['tabVal' => 1], 'prConfig' => ['val' => 12],
]]];
$config = MainNavigationConfig::read($home);
navCheck($config['menus'][0]['selected_icon'] === '/selected.svg' && $config['menus'][0]['icon'] === '/normal.svg', 'old icon order and links are retained');
$embedded = $config; $embedded['menus'][0]['icon'] = 'data:image/png;base64,' . base64_encode(str_repeat('legacy-icon', 200));
navCheck(MainNavigationConfig::validate($embedded)['menus'][0]['icon'] === $embedded['menus'][0]['icon'], 'existing embedded image icons are preserved byte for byte');
$config['name'] = '常用导航'; $config['corner'] = 24; $config['background_mode'] = 'custom'; $config['background_color'] = '#123456';
$config['text_mode'] = 'custom'; $config['text_color'] = '#654321'; $config['selected_color'] = '#ABCDEF';
$config['menus'][] = ['name' => '分类', 'link' => '/pages/goods_cate/goods_cate?sid=21', 'icon' => '/category.svg', 'selected_icon' => '/category-selected.svg'];
$updated = MainNavigationConfig::apply($home, $config);
navCheck($updated['title'] === $home['title'] && $updated['value']['banner'] === $home['value']['banner'], 'navigation update cannot replace other home components');
navCheck($updated['value']['footer']['prConfig']['val'] === 12, 'legacy floating layout spacing is preserved');
navCheck(MainNavigationConfig::read($updated) === MainNavigationConfig::validate($config), 'navigation settings survive save and reload');
foreach ([['menus' => []], ['corner' => 999], ['background_color' => 'url(x)'], ['background_color' => 'rgba(1,2,3)'], ['background_color' => 'rgb(1,2,3,0.5)'], ['visible_pages' => [['x']]], ['visible_pages' => ['/admin/']], ['name' => ''],
    ['menus' => [['name' => '跳转', 'link' => 'javascript:alert(1)', 'icon' => '/x.svg', 'selected_icon' => '/y.svg']]]] as $invalid) {
    try { MainNavigationConfig::validate(array_replace($config, $invalid)); throw new RuntimeException('Invalid configuration accepted'); }
    catch (crmeb\exceptions\AdminException $e) {}
}
navCheck(true, 'invalid menu counts, links, display pages, colors and names are rejected');
$without = ['title' => '保留', 'value' => ['banner' => ['name' => 'banner']]];
$new = MainNavigationConfig::apply($without, $config);
navCheck(count($new['value']) === 2 && $new['value']['banner'] === $without['value']['banner'], 'missing navigation is inserted without replacing the home page');
class NavThemeProbe extends app\services\diy\ThemeServices { public function __construct($dao) { $this->dao = $dao; } }
$dao = new class($home) {
    public $data; public $writes = [];
    public function __construct($home) { $this->data = ['id' => 7, 'is_use' => 1, 'type' => 0, 'home_data' => json_encode($home), 'home_default_data' => json_encode($home)]; }
    public function get($where) { return new class($this->data) { private $data; public function __construct($d) { $this->data = $d; } public function toArray() { return $this->data; } }; }
    public function update($id, $data) { $this->writes[] = [$id, $data]; $this->data = array_replace($this->data, $data); }
    public function value($where, $field) { return $this->data[$field] ?? 0; }
};
$service = new NavThemeProbe($dao);
navCheck($service->saveTheme(0, ['type' => 'navigation', 'value' => $config]) === 7, 'standalone navigation saves to the active theme, never creates a blank theme');
navCheck(count($dao->writes) === 1 && !isset($dao->writes[0][1]['category_data']), 'navigation save only touches home navigation and version');
navCheck($service->getThemeInfo(0, 'navigation') === MainNavigationConfig::validate($config), 'editor reads the saved navigation configuration');
navCheck($service->themeNavigation()['menuList'][1]['link'] === '/pages/goods_cate/goods_cate?sid=21', 'storefront receives configured menu query parameters');
