<?php
require __DIR__ . '/cart_decoration.php';

$service->saveThemeImage(7, ['type' => 'category', 'image' => '/uploads/category-cover.png']);
navCheck(($dao->data['category_image'] ?? '') === '/uploads/category-cover.png', 'category cover is persisted by the image endpoint');
navCheck(($dao->data['category_default_image'] ?? '') === '/uploads/category-cover.png', 'custom category cover becomes the restore default');
$service->saveTheme(7, ['type' => 'category', 'value' => ['status' => 2], 'tid' => 0, 'title' => '', 'page_type' => 'theme']);
navCheck($dao->data['category_image'] === '/uploads/category-cover.png', 'saving category settings retains a captured cover');
$dao->data['category_image'] = '/statics/images/cate1.png';
$service->saveTheme(7, ['type' => 'category', 'value' => ['status' => 3], 'tid' => 0, 'title' => '', 'page_type' => 'theme']);
navCheck($dao->data['category_image'] === '/statics/images/cate3.png', 'legacy placeholder covers still follow category layout');

$beforeCart = $service->getThemeInfo(7, 'cart');
$service->saveThemeImage(7, ['type' => 'cart', 'image' => '/uploads/cart-cover.png']);
$storedTheme = json_decode($dao->data['theme_data'], true);
navCheck(($storedTheme['cart_image'] ?? '') === '/uploads/cart-cover.png', 'cart cover is persisted inside theme JSON');
navCheck($service->getThemeInfo(7, 'cart') === $beforeCart, 'capturing cart cover retains cart settings');
navCheck($storedTheme['theme_color'] === '#E93323', 'capturing cart cover retains theme palette');
navCheck(json_decode($dao->data['theme_default_data'], true)['cart_image'] === '/uploads/cart-cover.png', 'custom cart cover becomes the restore default');
$service->saveTheme(7, ['type' => 'theme', 'value' => array_replace($theme, ['theme_color' => '#123456']), 'tid' => 0, 'title' => '', 'page_type' => 'theme']);
$storedTheme = json_decode($dao->data['theme_data'], true);
navCheck($storedTheme['theme_color'] === '#123456' && ($storedTheme['cart_image'] ?? '') === '/uploads/cart-cover.png', 'palette changes retain cart cover');
navCheck($service->getThemeInfo(7, 'cart') === $beforeCart, 'palette changes retain cart settings');
$service->saveTheme(7, ['type' => 'cart', 'value' => $cart, 'tid' => 0, 'title' => '', 'page_type' => 'theme']);
navCheck(json_decode($dao->data['theme_data'], true)['cart_image'] === '/uploads/cart-cover.png', 'cart settings changes retain cart cover');

$dao->data['type'] = 1;
$categoryDefault = $dao->data['category_default_image'];
$themeDefault = $dao->data['theme_default_data'];
$service->saveThemeImage(7, ['type' => 'category', 'image' => '/uploads/market-category.png']);
$service->saveThemeImage(7, ['type' => 'cart', 'image' => '/uploads/market-cart.png']);
navCheck($dao->data['category_image'] === '/uploads/market-category.png' && $dao->data['category_default_image'] === $categoryDefault, 'market category cover changes retain original default');
navCheck(json_decode($dao->data['theme_data'], true)['cart_image'] === '/uploads/market-cart.png' && $dao->data['theme_default_data'] === $themeDefault, 'market cart cover changes retain original default');

$dao->data['home_data'] = json_encode($home);
$dao->data['category_data'] = '2';
$dao->data['theme_data'] = json_encode($theme);
navCheck($service->themeNavigation('category')['name'] === 'pageFoot', 'legacy scalar category still inherits legacy footer');
navCheck($service->themeNavigation('cart')['name'] === 'pageFoot', 'legacy cart without decoration still inherits legacy footer');
$dao->data['category_data'] = json_encode(['status' => 2, 'navigation_mode' => 'page', 'navigation' => []]);
$dao->data['theme_data'] = json_encode(array_replace($theme, ['cart_page' => ['navigation_mode' => 'page', 'navigation' => []]]));
navCheck($service->themeNavigation('category') === [] && $service->themeNavigation('cart') === [], 'explicitly removed category and cart navigation stays removed');

$copyDao = new class($dao->data) {
    public $source;
    public $inserted;
    public function __construct($source) { $this->source = $source; }
    public function get($id) { return new class($this->source) {
        private $source;
        public function __construct($source) { $this->source = $source; }
        public function toArray() { return $this->source; }
    }; }
    public function insertGetId($data) { $this->inserted = $data; return 8; }
};
$copyService = new NavThemeProbe($copyDao);
navCheck($copyService->saveTheme(0, ['type' => 'cart', 'value' => $cart, 'tid' => 7, 'title' => '另存购物车', 'page_type' => 'theme']) === 8, 'cart save-as creates a theme from the source');
navCheck($copyDao->inserted['category_data'] === $copyDao->source['category_data'] && $copyDao->inserted['category_image'] === $copyDao->source['category_image'], 'cart save-as retains source category layout and cover');
