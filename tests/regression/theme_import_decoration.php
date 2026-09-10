<?php
require __DIR__ . '/category_decoration.php';
$importDao = new class {
    public $saved;
    public function insertGetId($data) { $this->saved=$data;return 23; }
    public function get($where) { return new class($this->saved) { private $data;public function __construct($data){$this->data=$data;}public function toArray(){return $this->data;} }; }
};
$importService = new CategoryThemeProbe($importDao);
$package=['title'=>'导入回归主题','info'=>'','category_data'=>'2','theme_data'=>['theme_color'=>'#1DB0FC']];
foreach(['home','category','detail','user','theme'] as $page){$package[$page.'_data_id']=0;$package[$page.'_image']='';if(!isset($package[$page.'_data']))$package[$page.'_data']='{"value":{}}';}
$importService->importThemeData($package);
$category=$importService->getThemeInfo(23,'category');
categoryCheck('imported layout 2 resolves to editable large-image preset', $category['status']===2 && $category['product_layout']==='large' && $category['buy_button_style']===8);
categoryCheck('import preserves the selected theme palette', $importService->getThemeInfo(23,'theme')['theme_color']==='#1DB0FC');
$package['category_data']=['status'=>3,'show_title'=>0,'page_title'=>'进口精选','actions_mode'=>'components','checkout'=>['name'=>'categoryCheckout','barLayout'=>'floating','showDetails'=>true,'showButtonCount'=>true],'category_style'=>['fillet'=>['val'=>18,'type'=>0]]];
$package['theme_data']=json_encode(['theme_color'=>'#1DB0FC','cart_page'=>['page_title'=>'购物袋','show_checkout'=>false,'list_style'=>['fillet'=>['val'=>16,'type'=>0]]]]);
$package['home_data']=['value'=>[]];
$importService->importThemeData($package);
$category=$importService->getThemeInfo(23,'category');$cart=$importService->getThemeInfo(23,'cart');
categoryCheck('structured category import retains title deletion and checkout components', $category['show_title']===0 && $category['checkout']['barLayout']==='floating' && $category['checkout']['showDetails']);
categoryCheck('import retains category component appearance', $category['category_style']['fillet']['val']===18);
categoryCheck('imported cart remains editable with its visibility and appearance', $cart['page_title']==='购物袋' && !$cart['show_checkout'] && $cart['list_style']['fillet']['val']===16);
categoryCheck('page JSON is encoded once', is_array($importService->getThemeInfo(23,'home')));
$restored=app\services\diy\CategoryPageConfig::read($importDao->saved['category_default_data']);
categoryCheck('restoring an imported theme retains the original component configuration', $restored===$category);
