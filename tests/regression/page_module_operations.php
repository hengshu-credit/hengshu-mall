<?php
require __DIR__ . '/cart_decoration.php';

foreach (['category' => 'search', 'cart' => 'service'] as $page => $type) {
    $config = $type === 'search'
        ? ['name' => 'headerSerch', 'tipConfig' => ['value' => '独立搜索'], 'isHide' => true]
        : ['service_labels' => ['独立服务', '精选商品', '售后无忧'], 'service_hidden' => true, 'service_style' => ['fillet' => ['val' => 18]]];
    $core = $type === 'search' ? 'category' : 'list';
    $value = ['extra_modules' => [['id' => $type . '_123', 'config' => $config]], 'content_order' => [$core, $type . '_123', $type]];
    $service->saveTheme(7, ['type' => $page, 'value' => $value, 'tid' => 0, 'title' => '', 'page_type' => 'theme']);
    $saved = $service->getThemeInfo(7, $page);
    navCheck($saved['content_order'] === $value['content_order'], "$page content order survives the actual theme service");
    navCheck(count($saved['extra_modules']) === 1 && $saved['extra_modules'][0]['id'] === $type . '_123', "$page independent component survives saving");
    navCheck($saved['extra_modules'][0]['config'][$type === 'search' ? 'isHide' : 'service_hidden'], "$page hidden copy survives saving");
    foreach ([['content_order' => [$core, $core]], ['content_order' => ['unknown']], ['extra_modules' => [$value['extra_modules'][0], $value['extra_modules'][0]]], ['extra_modules' => [['id' => $core, 'config' => $config]]]] as $invalid) {
        try {
            \app\services\diy\PageModuleConfig::validate(array_replace($value, $invalid), $page);
            throw new RuntimeException('Invalid order or repeated singleton was accepted');
        } catch (\crmeb\exceptions\AdminException $expected) {}
    }
    navCheck(true, "$page rejects duplicate identities and invalid order");
}
