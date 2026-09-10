<?php
require __DIR__ . '/main_navigation.php';
$homeConfig = app\services\diy\MainNavigationConfig::apply([], app\services\diy\MainNavigationConfig::defaults());
$other = $homeConfig; $other['value']['mainNavigation']['menuList'][0]['name'] = '详情导航';
$dao->data['detail_data'] = json_encode($other);
$dao->data['user_data'] = json_encode(['navigation_mode' => 'page', 'value' => []]);
$dao->data['category_data'] = json_encode(['status' => 2, 'navigation_mode' => 'page', 'navigation' => $other['value']['mainNavigation']]);
navCheck($service->themeNavigation('detail')['menuList'][0]['name'] === '详情导航', 'detail resolves its own navigation');
navCheck($service->themeNavigation('user') === [], 'deleting a page navigation does not restore the home navigation');
navCheck($service->themeNavigation('category')['menuList'][0]['name'] === '详情导航', 'category resolves its own navigation');
navCheck($service->themeNavigation()['menuList'][0]['name'] !== '详情导航', 'other pages do not overwrite home navigation');
$nav = $other['value']['mainNavigation'];
$nav['name'] = 'mainNavigation';
$nav['paddingConfig'] = ['val' => 12, 'isAll' => false, 'valList' => [['val' => 12], ['val' => 12], ['val' => 12], ['val' => 12]]];
$nav['componentBgConfig'] = ['tabVal' => 1, 'imageConfig' => ['url' => '/uploads/original.svg']];
$page = ['navigation_mode' => 'page', 'value' => ['nav' => $nav, 'product' => ['name' => 'productInfo']]];
$homeBefore = $dao->data['home_data'];
$service->saveTheme(7, ['type' => 'detail', 'value' => $page, 'tid' => 0, 'title' => '', 'page_type' => 0]);
navCheck($dao->data['home_data'] === $homeBefore, 'saving detail navigation never changes home JSON');
navCheck($service->themeNavigation('detail')['paddingConfig'] === $nav['paddingConfig'], 'common style dimensions survive the real theme service');
navCheck($service->themeNavigation('detail')['componentBgConfig']['imageConfig']['url'] === '/uploads/original.svg', 'original SVG background URL survives saving without conversion');
$category = ['status' => 3, 'navigation_mode' => 'page', 'navigation' => $nav, 'category_style' => ['paddingConfig' => $nav['paddingConfig']], 'layout_configs' => [1 => ['status' => 1, 'columns' => 4], 2 => ['status' => 2, 'product_layout' => 'grid']]];
$service->saveTheme(7, ['type' => 'category', 'value' => $category, 'tid' => 0, 'title' => '', 'page_type' => 0]);
$stored = $service->getThemeInfo(7, 'category');
navCheck($stored['layout_configs'][1]['columns'] === 4 && $stored['layout_configs'][2]['product_layout'] === 'grid', 'inactive category layouts survive server roundtrip');
$page['value']['duplicate'] = $nav;
try { app\services\diy\MainNavigationConfig::validatePage($page); throw new RuntimeException('duplicate navigation accepted'); } catch (crmeb\exceptions\AdminException $e) {}
$nav['componentBgConfig']['imageConfig']['url'] = 'javascript:alert(1)';
try { app\services\diy\MainNavigationConfig::validateComponent($nav); throw new RuntimeException('unsafe background accepted'); } catch (crmeb\exceptions\AdminException $e) {}
navCheck(true, 'duplicate navigation and invalid background URLs are rejected');
