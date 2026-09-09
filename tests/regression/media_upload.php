<?php
// Isolated local filesystem and cloud transport probes; no production DB or bucket access.
error_reporting(E_ALL);
$root = dirname(__DIR__, 2) . '/crmeb';
$prefixes = require $root . '/vendor/composer/autoload_psr4.php';
spl_autoload_register(function ($class) use ($prefixes) {
    foreach ($prefixes as $prefix => $dirs) {
        if (strpos($class, $prefix) !== 0) continue;
        foreach ($dirs as $dir) {
            $file = $dir . '/' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
            if (is_file($file)) { require $file; return; }
        }
    }
});
function mediaCheck($label, $ok) { if (!$ok) throw new RuntimeException('FAIL: ' . $label); echo 'PASS: ' . $label . "\n"; }
function mediaReject($label, callable $call) {
    try { $call(); } catch (InvalidArgumentException $error) { mediaCheck($label, true); return; }
    mediaCheck($label, false);
}
$rules = require $root . '/config/upload.php';
mediaCheck('shared media validator exists', class_exists(crmeb\services\upload\MediaFile::class));
$svg = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)" viewBox="0 0 10 10"><script>alert(1)</script><foreignObject><div>unsafe</div></foreignObject><image href="https://evil.test/a"/><style>@import url(https://evil.test/b);</style><rect id="safe" width="10" height="10" fill="red" onclick="alert(2)" style="stroke:blue;fill:url(https://evil.test/c)"/></svg>';
mediaReject('active SVG rejected instead of rewritten', function () use ($svg, $rules) { crmeb\services\upload\MediaFile::prepare($svg, 'test.svg', $rules); });
$unsafeSvg = $svg;
$svg = '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">  <rect width="10" height="10" fill="red" style="stroke:blue"/> </svg>';
$clean = $svg;
$info = crmeb\services\upload\MediaFile::prepare($clean, 'test.svg', $rules);
mediaCheck('safe SVG preserves exactly the original bytes', $clean === $svg && $info['mime'] === 'image/svg+xml');
$exportedSvg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="100" viewBox="0 0 10 10" class="logo" role="img" aria-label="Brand logo" xml:space="preserve"><defs><path id="shape" d="M0 0 L10 10"/></defs><use xlink:href="#shape"/></svg>';
$bytes = $exportedSvg;
crmeb\services\upload\MediaFile::prepare($bytes, 'export.svg', $rules);
mediaCheck('typical SVG export attributes and xlink preserved byte-for-byte', $bytes === $exportedSvg);
foreach (['<svg xmlns="http://www.w3.org/2000/svg"><style>rect{fill:red}</style></svg>', '<?xml-stylesheet href="https://evil.test/style.css"?><svg/>', '<svg><use href="https://evil.test/a.svg#x"/></svg>'] as $unsafe) {
    mediaReject('unsupported CSS sheets, processing instructions and external links rejected', function () use ($unsafe, $rules) { crmeb\services\upload\MediaFile::prepare($unsafe, 'test.svg', $rules); });
}
foreach (['<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg>&x;</svg>', '<html>fake</html>'] as $unsafe) {
    mediaReject('invalid SVG and entity declarations rejected', function () use ($unsafe, $rules) { crmeb\services\upload\MediaFile::prepare($unsafe, 'test.svg', $rules); });
}
mediaReject('SVG disguised as PNG rejected', function () use ($svg, $rules) { crmeb\services\upload\MediaFile::prepare($svg, 'test.png', $rules); });
$png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=');
$copy = $png;
crmeb\services\upload\MediaFile::prepare($copy, 'test.PNG', $rules, 'application/octet-stream');
mediaCheck('binary PNG unchanged with generic browser MIME', $copy === $png);
mediaReject('fake AVIF rejected', function () use ($rules) { $bytes = 'not an image'; crmeb\services\upload\MediaFile::prepare($bytes, 'test.avif', $rules); });
mediaReject('disallowed extension rejected despite valid image', function () use ($rules, $png) { crmeb\services\upload\MediaFile::prepare($png, 'test.php', $rules); });
mediaReject('configured size limit enforced', function () use ($rules, $png) { $rules['filesize'] = 1; crmeb\services\upload\MediaFile::prepare($png, 'test.png', $rules); });
foreach (['avif', 'jpg', 'webp', 'gif', 'bmp', 'ico', 'webm', 'mov', 'm4v', 'ogv', 'avi', 'wmv', 'rm', 'mpg', 'flv'] as $extension) {
    $fixture = file_get_contents(__DIR__ . '/fixtures/media/tiny.' . $extension);
    $bytes = $fixture;
    $media = crmeb\services\upload\MediaFile::prepare($bytes, 'tiny.' . $extension, $rules, 'application/octet-stream');
    mediaCheck($extension . ' original encoded bytes preserved', $bytes === $fixture && $media['mime'] === crmeb\services\upload\MediaFile::MIMES[$extension]);
    mediaReject($extension . ' rejects fake container', function () use ($extension, $rules) { $fake = '<svg/>'; crmeb\services\upload\MediaFile::prepare($fake, 'fake.' . $extension, $rules); });
}
$video = file_get_contents($root . '/vendor/alipaysdk/easysdk/php/test/resources/fixture/sample.mp4');
$bytes = $video;
crmeb\services\upload\MediaFile::prepare($bytes, 'sample.mp4', $rules);
mediaCheck('real MP4 bytes preserved', $bytes === $video);

// Exercise real entry methods with only bucket transport and Think facade infrastructure replaced.
function getLang($message, $replace = []) { return $message; }
function sys_config($key, $default = null) { return $default; }
function public_path() { global $mediaRoot; return $mediaRoot . 'public/'; }
$mediaRoot = sys_get_temp_dir() . '/crmeb-media-' . bin2hex(random_bytes(6)) . '/';
mkdir($mediaRoot . 'public/uploads', 0700, true);
$app = new class {
    public $request;
    public function getRootPath() { global $mediaRoot; return $mediaRoot; }
};
$app->request = new class { public $current; public function file($name) { return $this->current; } };
function app() { global $app; return $app; }
class MediaConfig {
    public static function get($key, $default = null) {
        global $rules;
        if ($key === 'filesystem.default') return 'public';
        if ($key === 'filesystem.disks.public.url') return '/uploads';
        if ($key === 'filesystem.disks.pem.url') return '';
        if (strpos($key, 'upload.') === 0) return $rules[substr($key, 7)] ?? $default;
        return $default;
    }
}
class_alias(MediaConfig::class, 'think\\facade\\Config');
class MediaFilesystem {
    public static $lastDisk;
    public static function disk($disk) { self::$lastDisk = $disk; return new self; }
    public function putFile($path, $file, $rule = null) { return $this->putFileAs($path, $file, 'fixture.' . $file->getOriginalExtension()); }
    public function putFileAs($path, $file, $name) {
        $key = trim($path . '/' . $name, '/'); $target = $this->path($key);
        if (!is_dir(dirname($target))) mkdir(dirname($target), 0700, true);
        copy($file->getRealPath(), $target); return $key;
    }
    public function path($key) { global $mediaRoot; return $mediaRoot . 'public/uploads/' . $key; }
}
class_alias(MediaFilesystem::class, 'think\\facade\\Filesystem');
class MediaCloudResult extends ArrayObject { public function toArray() { return ['@metadata' => ['statusCode' => 200]]; } }
class MediaCloudTransport {
    public static $bytes; public static $mime;
    public function uploadToken($bucket, $key = '') { return 'fixture-token'; }
    public function uploadFile($bucket, $key, $path, $options = []) { self::$bytes = file_get_contents($path); self::$mime = $options['Content-Type'] ?? ''; return ['info' => ['url' => 'fixture']]; }
    public function putObject(...$args) {
        if (is_array($args[0])) {
            $options = $args[0]; self::$bytes = isset($options['SourceFile']) ? file_get_contents($options['SourceFile']) : $options['Body'];
            self::$mime = $options['ContentType'] ?? '';
            return new MediaCloudResult(['ObjectURL' => 'https://fixture.invalid/file']);
        }
        if (count($args) === 4) { self::$bytes = $args[2]; self::$mime = $args[3]['Content-Type'] ?? ''; }
        else { self::$bytes = $args[1]; self::$mime = $args[2] ?? ''; }
        return ['info' => ['url' => 'fixture']];
    }
}
class MediaQiniuUploader {
    public function put($token, $key, $bytes, $params = null, $mime = '') { MediaCloudTransport::$bytes = $bytes; MediaCloudTransport::$mime = $mime; return [[], null]; }
    public function putFile($token, $key, $path, $params = null, $mime = '') { return $this->put($token, $key, file_get_contents($path), $params, $mime); }
}
class_alias(MediaQiniuUploader::class, 'Qiniu\\Storage\\UploadManager');
foreach (['Oss', 'Qiniu', 'Cos', 'Jdoss', 'Obs', 'Tyoss'] as $driver) {
    eval('class MediaProbe' . $driver . ' extends \\crmeb\\services\\upload\\storage\\' . $driver . ' { protected function app() { return new MediaCloudTransport(); } }');
}
try {
    foreach (['Local', 'Oss', 'Qiniu', 'Cos', 'Jdoss', 'Obs', 'Tyoss'] as $driver) {
        $class = $driver === 'Local' ? 'crmeb\\services\\upload\\storage\\Local' : 'MediaProbe' . $driver;
        foreach (['move', 'stream', 'down'] as $method) {
            if ($method === 'down' && $driver !== 'Local') continue;
            foreach (['svg' => $svg, 'avif' => file_get_contents(__DIR__ . '/fixtures/media/tiny.avif'), 'mp4' => $video, 'webm' => file_get_contents(__DIR__ . '/fixtures/media/tiny.webm'), 'mov' => file_get_contents(__DIR__ . '/fixtures/media/tiny.mov'), 'm4v' => file_get_contents(__DIR__ . '/fixtures/media/tiny.m4v'), 'ogv' => file_get_contents(__DIR__ . '/fixtures/media/tiny.ogv')] as $extension => $fixture) {
                $upload = (new $class($driver, [], 'upload'))->validate($rules)->to('probe')->setAuthThumb(true);
                if ($method === 'move') {
                    file_put_contents($mediaRoot . 'incoming', $fixture);
                    $app->request->current = new think\file\UploadedFile($mediaRoot . 'incoming', 'fixture.' . $extension, 'application/octet-stream', null, true);
                    $result = $upload->move();
                } else $result = $upload->$method($fixture, 'fixture.' . $extension);
                mediaCheck($driver . ' ' . $method . ' accepts ' . $extension, $result !== false);
                $stored = $driver === 'Local' ? file_get_contents($mediaRoot . 'public/uploads/probe/fixture.' . $extension) : MediaCloudTransport::$bytes;
                if ($extension === 'svg') mediaCheck($driver . ' ' . $method . ' preserves SVG bytes', $stored === $fixture);
                else mediaCheck($driver . ' ' . $method . ' preserves ' . $extension . ' bytes', $stored === $fixture);
                if ($driver === 'Local' && $method === 'move') mediaCheck('generic MIME stays on public media disk', MediaFilesystem::$lastDisk === 'public');
                if ($driver !== 'Local') mediaCheck($driver . ' sets canonical media content type', MediaCloudTransport::$mime === crmeb\services\upload\MediaFile::MIMES[$extension]);
                $info = $method === 'down' ? $upload->getDownloadInfo() : $upload->getUploadInfo();
                mediaCheck($driver . ' reports canonical attachment MIME', $info['type'] === crmeb\services\upload\MediaFile::MIMES[$extension]);
            }
            $upload = (new $class($driver, [], 'upload'))->validate($rules)->to('probe');
            if ($method === 'move') {
                file_put_contents($mediaRoot . 'incoming', $svg);
                $app->request->current = new think\file\UploadedFile($mediaRoot . 'incoming', 'fake.png', 'image/png', null, true);
                $result = $upload->move();
            } else $result = $upload->$method($svg, 'fake.png');
            mediaCheck($driver . ' ' . $method . ' rejects disguised SVG', $result === false);
            if ($method === 'move') {
                file_put_contents($mediaRoot . 'incoming', $unsafeSvg);
                $app->request->current = new think\file\UploadedFile($mediaRoot . 'incoming', 'unsafe.svg', 'image/svg+xml', null, true);
                $result = $upload->move();
            } else $result = $upload->$method($unsafeSvg, 'unsafe.svg');
            mediaCheck($driver . ' ' . $method . ' rejects active SVG without rewriting', $result === false);
        }
        $upload = (new $class($driver, ['thumb' => ['image_thumb_status' => 1], 'water' => ['image_watermark_status' => 1, 'watermark_type' => 2, 'watermark_text' => 'fixture']], 'upload'))->validate($rules)->to('probe')->setAuthThumb(false);
        $result = $upload->stream($png, 'unchanged.png');
        mediaCheck($driver . ' original-mode stream succeeds with transforms configured globally', $result !== false);
        $stored = $driver === 'Local' ? file_get_contents($mediaRoot . 'public/uploads/probe/unchanged.png') : MediaCloudTransport::$bytes;
        mediaCheck($driver . ' original-mode bytes and URL have no thumbnail/watermark', $stored === $png && (!isset($result->filePathWater) || $result->filePathWater === $result->filePath));
    }
} finally {
    $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($mediaRoot, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
    foreach ($files as $file) { if ($file->isDir()) rmdir($file->getPathname()); else unlink($file->getPathname()); }
    rmdir($mediaRoot);
}
echo "Media upload entry checks passed\n";
