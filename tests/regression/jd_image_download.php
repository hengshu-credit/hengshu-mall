<?php
// A local synthetic image server is required; only the upload storage boundary is replaced.
error_reporting(E_ALL);
$prefixes = require dirname(__DIR__, 2) . '/crmeb/vendor/composer/autoload_psr4.php';
spl_autoload_register(function ($class) use ($prefixes) {
    foreach ($prefixes as $prefix => $dirs) {
        if (strpos($class, $prefix) !== 0) continue;
        foreach ($dirs as $dir) {
            $file = $dir . '/' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
            if (is_file($file)) { require $file; return; }
        }
    }
});
function getLang($message, $replace = []) { return $message; }
function sys_config($name, $default = null) { return $default; }
class JdImageConfig {
    public static $limit = 52428800;
    public static function get($key, $default = null) { return $key === 'upload.filesize' ? self::$limit : ['png', 'jpg', 'avif', 'webm']; }
}
class_alias(JdImageConfig::class, 'think\\facade\\Config');
class JdUploadProbe {
    public static $bytes;
    public static $name;
    public static function init($type) { return new self; }
    public function to($path) { return $this; }
    public function validate() { return $this; }
    public function setAuthThumb($value) { return $this; }
    public function stream($data, $name) { self::$bytes = $data; self::$name = $name; return true; }
    public function getUploadInfo() { return ['dir' => '/uploads/fixture.png', 'name' => 'fixture.png', 'size' => strlen(self::$bytes), 'type' => 'image/png']; }
}
class_alias(JdUploadProbe::class, 'app\\services\\other\\UploadService');
if (isset($argv[2])) require $argv[2]; // Optional original version for reproducing the regression.
$service = new app\services\product\product\CopyTaobaoServices();
ob_start();
try {
    $image = $service->downloadImage($argv[1], '', 1);
    $output = ob_get_clean();
    $original = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=');
    if ($output !== '' || JdUploadProbe::$bytes !== $original || $image['path'] !== '/uploads/fixture.png') throw new RuntimeException('Original image bytes must reach upload storage unchanged without corrupting the API output');
    $headers = $service->getAntiHotlinkingHeaders('https://img10.360buyimg.com/n1/jfs/test.jpg');
    if (!in_array('Referer: https://www.jd.com/', $headers, true)) throw new RuntimeException('JD CDN requires JD image headers');
    $extension = $service->getImageExtname('https://img10.360buyimg.com/a.JPG.AVIF?token=x#preview');
    if ($extension['ext_name'] !== 'avif') throw new RuntimeException('Native format extension should be preserved and normalized');
    $baseUrl = preg_replace('#/[^/]*$#', '', $argv[1]);
    foreach (['avif', 'webm'] as $nativeFormat) {
        $service->downloadImage($baseUrl . '/native.' . $nativeFormat, '', 1);
        $source = file_get_contents(__DIR__ . '/fixtures/media/tiny.' . $nativeFormat);
        if (JdUploadProbe::$bytes !== $source || pathinfo(JdUploadProbe::$name, PATHINFO_EXTENSION) !== $nativeFormat) throw new RuntimeException('Native media must reach storage with identical bytes and format');
    }
    $service->downloadImage($baseUrl . '/compressed.png', '', 1);
    if (JdUploadProbe::$bytes !== $original) throw new RuntimeException('HTTP transfer decoding must preserve the original file bytes exactly');
    try {
        $service->downloadImage($baseUrl . '/missing.png', '', 1);
        throw new RuntimeException('HTTP error must not be stored as an image');
    } catch (crmeb\exceptions\AdminException $expected) {}
    JdImageConfig::$limit = 8;
    try {
        $service->downloadImage($argv[1], '', 1);
        throw new RuntimeException('Download must enforce the storage byte limit');
    } catch (crmeb\exceptions\AdminException $expected) {}
    echo "PASS: downloaded binary image reaches upload storage; response output stays clean; JD CDN headers present\n";
} catch (Throwable $error) {
    if (ob_get_level()) ob_end_clean();
    fwrite(STDERR, 'FAIL: ' . $error->getMessage() . "\n"); exit(1);
}
