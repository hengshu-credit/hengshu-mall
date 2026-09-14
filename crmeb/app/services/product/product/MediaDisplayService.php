<?php
namespace app\services\product\product;

/** Read-only display rendition; original uploads remain unchanged. */
class MediaDisplayService
{
    private $origin;
    public function __construct(string $origin = 'http://media-display:8092') { $this->origin = rtrim($origin, '/'); }

    public function image(string $path): string
    {
        if (strlen($path) > 600 || !preg_match('#^/uploads/[a-zA-Z0-9_/-]+\.avif$#i', $path) || strpos($path, '..') !== false) {
            throw new \InvalidArgumentException('Invalid image path');
        }
        $context = stream_context_create(['http'=>['timeout'=>10, 'follow_location'=>0, 'header'=>"Accept: image/png\r\n"]]);
        $data = @file_get_contents($this->origin . $path, false, $context, 0, 32 * 1024 * 1024 + 1);
        if ($data === false || strlen($data) > 32 * 1024 * 1024 || substr($data, 0, 8) !== "\x89PNG\r\n\x1a\n") {
            throw new \RuntimeException('Image rendition unavailable');
        }
        return $data;
    }
}
