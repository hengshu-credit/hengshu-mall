<?php
declare(strict_types=1);

namespace crmeb\exceptions { class AdminException extends \RuntimeException {} }
namespace {
    if (!function_exists('mb_strlen')) { function mb_strlen($value) { return strlen($value); } }
    require __DIR__ . '/../../crmeb/app/services/diy/CommonPageConfig.php';
    use app\services\diy\CommonPageConfig;
    $pages = CommonPageConfig::pages([]);
    if (count($pages) !== count(CommonPageConfig::PAGES)) throw new RuntimeException('common page defaults incomplete');
    if ($pages['goodsList']['list_layout'] !== 'grid' || $pages['goodsList']['show_title'] !== true) throw new RuntimeException('goods list default not normalized');
    $custom = CommonPageConfig::page(['page_title' => '订单记录', 'card_radius' => 28, 'navigation_mode' => 'none'], 'orderList');
    if ($custom['page_title'] !== '订单记录' || $custom['card_radius'] !== 28 || $custom['navigation_mode'] !== 'none') throw new RuntimeException('common page custom config not preserved');
    $failed = false;
    try { CommonPageConfig::page(['background_color' => 'red'], 'orderList'); } catch (\Throwable $e) { $failed = true; }
    if (!$failed) throw new RuntimeException('unsafe common page color accepted');
    $failed = false;
    try { CommonPageConfig::page(['background_image' => 'javascript:alert(1)'], 'orderList'); } catch (\Throwable $e) { $failed = true; }
    if (!$failed) throw new RuntimeException('unsafe common page background accepted');
    echo "PASS: common page defaults, custom settings and validation\n";
}
