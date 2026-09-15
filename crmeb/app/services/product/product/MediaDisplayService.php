<?php
namespace app\services\product\product;

/** Read-only display rendition; original uploads remain unchanged. */
class MediaDisplayService
{
    private $origin;
    public function __construct(string $origin = 'http://media-display:8092') { $this->origin = rtrim($origin, '/'); }

    public function image(string $path, string $format = 'png', string $accept = ''): string
    {
        if (!in_array($format, ['png', 'auto'], true) || strlen($path) > 600 || !preg_match('#^/uploads/[a-zA-Z0-9_/-]+\.avif$#i', $path) || strpos($path, '..') !== false) {
            throw new \InvalidArgumentException('Invalid image path');
        }
        $original = false;
        if ($format === 'auto') {
            foreach (explode(',', strtolower($accept)) as $item) {
                $parts = array_map('trim', explode(';', $item));
                if ($parts[0] !== 'image/avif') continue;
                $quality = '1';
                foreach (array_slice($parts, 1) as $parameter) {
                    if (strpos($parameter, 'q=') === 0) { $quality = trim(substr($parameter, 2)); break; }
                }
                $original = is_numeric($quality) && (float)$quality > 0 && (float)$quality <= 1;
                break;
            }
        }
        $context = stream_context_create(['http'=>['timeout'=>20, 'follow_location'=>0, 'header'=>$original ? "Accept: image/avif\r\n" : "Accept: image/png\r\n"]]);
        $data = @file_get_contents($this->origin . $path . ($format === 'auto' ? '?format=auto' : ''), false, $context, 0, 32 * 1024 * 1024 + 1);
        $validImage = $data !== false && (substr($data, 0, 8) === "\x89PNG\r\n\x1a\n" || ($format === 'auto' && substr($data, 0, 3) === "\xff\xd8\xff") || ($original && substr($data, 4, 4) === 'ftyp' && strpos(substr($data, 8, 32), 'avif') !== false));
        if (!$validImage || strlen($data) > 32 * 1024 * 1024) {
            throw new \RuntimeException('Image rendition unavailable');
        }
        return $data;
    }
}
