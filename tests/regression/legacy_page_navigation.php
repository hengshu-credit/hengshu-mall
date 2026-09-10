<?php
require __DIR__ . '/main_navigation.php';
$dao->data['home_data'] = json_encode($home);
$dao->data['theme_data'] = '{}';
foreach ([1, 2, 3] as $layout) {
    $dao->data['category_data'] = (string)$layout;
    $navigation = $service->themeNavigation('category');
    navCheck(($navigation['mainNavigation']['pageScoped'] ?? false) === true, "legacy category layout $layout navigation bypasses page visibility filters");
    navCheck($navigation['menuList'] === $home['value']['footer']['menuList'], "legacy category layout $layout retains menu links and icons");
}
navCheck(($service->themeNavigation('cart')['mainNavigation']['pageScoped'] ?? false) === true, 'legacy cart navigation bypasses page visibility filters');
navCheck(!isset($service->themeNavigation('home')['mainNavigation']['pageScoped']), 'legacy adaptation does not change home navigation');
navCheck($dao->data['home_data'] === json_encode($home), 'legacy navigation adaptation never rewrites home data');
$independent = $home['value']['footer'];
$independent['mainNavigation'] = ['visiblePages' => ['/pages/index/index']];
$independent['menuList'][0]['name'] = '独立导航';
$dao->data['category_data'] = json_encode(['status' => 2, 'navigation' => $independent]);
$dao->data['theme_data'] = json_encode(['cart_page' => ['navigation' => $independent]]);
foreach (['category', 'cart'] as $page) {
    $navigation = $service->themeNavigation($page);
    navCheck(($navigation['mainNavigation']['pageScoped'] ?? false) === true && $navigation['menuList'][0]['name'] === '独立导航', "$page independent navigation is scoped even without an old mode flag");
}
$dao->data['category_data'] = json_encode(['status' => 2, 'navigation_mode' => 'page', 'navigation' => []]);
$dao->data['theme_data'] = json_encode(['cart_page' => ['navigation_mode' => 'page', 'navigation' => []]]);
navCheck($service->themeNavigation('category') === [] && $service->themeNavigation('cart') === [], 'explicit navigation removal wins over legacy fallback');
