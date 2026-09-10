<?php
require __DIR__ . '/main_navigation.php';
$fixtures=json_decode(file_get_contents(__DIR__.'/../../.build/component-reuse-fixtures.json'),true);
$category=app\services\diy\CategoryPageConfig::validate($fixtures['category']);
$cart=app\services\diy\CartPageConfig::validate($fixtures['cart']);
navCheck($category['title_component']['title']==='统一标题' && $category['title_component']['textColor']==='#2468AB', 'category persists the reusable title and its full color settings');
navCheck($category['search_component']['name']==='headerSerch' && $category['search_placeholder']==='统一搜索内容', 'category persists the existing search component schema');
navCheck($cart['title_component']['title']==='统一购物车' && $cart['title_actions']['right']===[], 'cart preserves the same title schema and explicitly empty buttons');
$invalid=$fixtures['category'];$invalid['search_component']['linkConfig']['value']='javascript:alert(1)';
try { app\services\diy\CategoryPageConfig::validate($invalid); throw new RuntimeException('Invalid search destination accepted'); }
catch (crmeb\exceptions\AdminException $expected) {}
