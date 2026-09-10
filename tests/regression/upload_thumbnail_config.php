<?php
// Stored empty dimensions must not break the actual cover-image upload path.
namespace crmeb\basic {
    class BaseStorage {}
}
namespace {
    require __DIR__ . '/../../crmeb/crmeb/services/upload/BaseUpload.php';
    require __DIR__ . '/../../crmeb/crmeb/services/upload/storage/Local.php';
    function app() { return new class { public function getRootPath() { return __DIR__ . '/'; } }; }
    class ThumbnailConfigProbe extends \crmeb\services\upload\storage\Local {
        public function config(array $values): array {
            $this->initialize(['thumb' => $values]);
            return $this->thumbConfig;
        }
    }
    $actual = (new ThumbnailConfigProbe())->config([
        'image_thumb_status' => 1,
        'thumb_big_width' => '', 'thumb_big_height' => null,
        'thumb_mid_width' => '300px', 'thumb_mid_height' => 0,
        'thumb_small_width' => -5, 'thumb_small_height' => '160',
    ]);
    foreach (['thumb_big_width' => 800, 'thumb_big_height' => 800,
        'thumb_mid_width' => 300, 'thumb_mid_height' => 300,
        'thumb_small_width' => 100, 'thumb_small_height' => 160] as $key => $expected) {
        if ($actual[$key] !== $expected) {
            throw new \RuntimeException($key . ' did not resolve to a usable image dimension');
        }
    }
    if ($actual['image_thumb_status'] !== 1) throw new \RuntimeException('Thumbnail setting changed');
    echo "PASS upload thumbnail dimensions: empty/invalid saved values use defaults; valid sizes survive\n";
}
