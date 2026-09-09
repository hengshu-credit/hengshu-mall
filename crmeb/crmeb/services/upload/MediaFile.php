<?php
declare(strict_types=1);

namespace crmeb\services\upload;

/** Byte-level media validation shared by local and object-storage uploads. No transcoding. */
class MediaFile
{
    const MIMES = [
        'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'gif' => 'image/gif',
        'webp' => 'image/webp', 'avif' => 'image/avif', 'svg' => 'image/svg+xml', 'bmp' => 'image/bmp', 'ico' => 'image/x-icon',
        'mp4' => 'video/mp4', 'm4v' => 'video/mp4', 'mov' => 'video/quicktime', 'webm' => 'video/webm', 'ogv' => 'video/ogg',
        'avi' => 'video/x-msvideo', 'wmv' => 'video/x-ms-wmv', 'rm' => 'application/vnd.rn-realmedia',
        'mpg' => 'video/mpeg', 'mpeg' => 'video/mpeg', 'flv' => 'video/x-flv',
    ];
    const VIDEOS = ['mp4', 'm4v', 'mov', 'webm', 'ogv', 'avi', 'wmv', 'rm', 'mpg', 'mpeg', 'flv'];

    public static function extension(string $name): string
    {
        return strtolower(pathinfo(explode('?', $name, 2)[0], PATHINFO_EXTENSION));
    }

    public static function prepare(string &$bytes, string $name, array $rules, string $declaredMime = ''): array
    {
        $ext = self::extension($name);
        if (preg_match('/[\x00-\x1f\\\\]/', $name) || preg_match('#(^|/)\.\.(/|$)#', $name) ||
            in_array($ext, ['php', 'phtml', 'pht', 'php3', 'php4', 'php5', 'php7', 'php8', 'shtml', 'shtm', 'htaccess', 'cgi', 'pl', 'py', 'jsp', 'asp', 'aspx'], true) ||
            !in_array($ext, $rules['fileExt'] ?? [], true)) throw new \InvalidArgumentException('不支持的文件格式');
        if ($bytes === '' || strlen($bytes) > ($rules['filesize'] ?? 52428800)) throw new \InvalidArgumentException('文件为空或超过大小限制');
        $mime = self::MIMES[$ext] ?? '';
        if ($ext === 'svg') {
            self::validateSvg($bytes);
        } elseif (in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'ico'], true)) {
            $info = @getimagesizefromstring($bytes);
            $types = ['jpg' => 2, 'jpeg' => 2, 'png' => 3, 'gif' => 1, 'webp' => 18, 'bmp' => 6, 'ico' => 17];
            if (!$info || ($info[2] ?? 0) !== $types[$ext]) throw new \InvalidArgumentException('图片内容与扩展名不符');
        } elseif (in_array($ext, ['avif', 'mp4', 'm4v', 'mov'], true)) {
            $boxes = self::isoBoxes($bytes);
            $ftyp = $boxes['ftyp'][0] ?? '';
            $brands = strlen($ftyp) >= 8 ? array_merge([substr($ftyp, 0, 4)], str_split(substr($ftyp, 8), 4)) : [];
            if ($ext === 'avif') {
                if (!array_intersect($brands, ['avif', 'avis']) || !isset($boxes['meta']) ||
                    (!isset($boxes['mdat']) && strpos($boxes['meta'][0], 'idat') === false) ||
                    strpos($boxes['meta'][0], 'av1C') === false) throw new \InvalidArgumentException('AVIF文件结构不正确');
            } elseif (!isset($boxes['moov']) || !isset($boxes['mdat']) ||
                ($ext !== 'mov' && !array_intersect($brands, ['isom', 'iso2', 'iso4', 'iso5', 'iso6', 'mp41', 'mp42', 'M4V ', 'MSNV', 'avc1', 'dash']))) {
                throw new \InvalidArgumentException('视频文件结构不正确');
            }
        } elseif ($ext === 'webm') {
            if (substr($bytes, 0, 4) !== "\x1a\x45\xdf\xa3" || strpos(substr($bytes, 0, 4096), "\x42\x82\x84webm") === false ||
                strpos($bytes, "\x18\x53\x80\x67") === false) throw new \InvalidArgumentException('WebM文件结构不正确');
        } elseif ($ext === 'ogv') {
            if (substr($bytes, 0, 5) !== "OggS\x00" || strpos(substr($bytes, 0, 65536), "\x80theora") === false) throw new \InvalidArgumentException('OGV文件结构不正确');
        } elseif ($ext === 'avi') {
            if (strlen($bytes) < 12 || substr($bytes, 0, 4) !== 'RIFF' || substr($bytes, 8, 4) !== 'AVI ' ||
                unpack('V', substr($bytes, 4, 4))[1] > strlen($bytes) - 8) throw new \InvalidArgumentException('AVI文件结构不正确');
        } elseif ($ext === 'wmv') {
            if (strlen($bytes) < 30 || substr($bytes, 0, 16) !== "\x30\x26\xb2\x75\x8e\x66\xcf\x11\xa6\xd9\x00\xaa\x00\x62\xce\x6c") throw new \InvalidArgumentException('WMV文件结构不正确');
        } elseif ($ext === 'rm') {
            if (strlen($bytes) < 18 || substr($bytes, 0, 4) !== '.RMF' || unpack('N', substr($bytes, 4, 4))[1] > strlen($bytes)) throw new \InvalidArgumentException('RM文件结构不正确');
        } elseif (in_array($ext, ['mpg', 'mpeg'], true)) {
            if (strlen($bytes) < 16 || !in_array(substr($bytes, 0, 4), ["\x00\x00\x01\xba", "\x00\x00\x01\xb3"], true)) throw new \InvalidArgumentException('MPEG文件结构不正确');
        } elseif ($ext === 'flv') {
            if (strlen($bytes) < 13 || substr($bytes, 0, 4) !== "FLV\x01" ||
                unpack('N', substr($bytes, 5, 4))[1] < 9 || unpack('N', substr($bytes, 5, 4))[1] > strlen($bytes)) throw new \InvalidArgumentException('FLV文件结构不正确');
        } else {
            // Preserve the existing document/certificate formats, using detected MIME when available.
            $mime = function_exists('finfo_open') ? (new \finfo(FILEINFO_MIME_TYPE))->buffer($bytes) : $declaredMime;
            if (!in_array($mime, $rules['fileMime'] ?? [], true)) throw new \InvalidArgumentException('不合法的文件类型');
            if (preg_match('/<\?php|<\?=|<\?[\s]/i', $bytes)) throw new \InvalidArgumentException('文件内容包含非法代码');
        }
        return ['ext' => $ext, 'mime' => $mime, 'size' => strlen($bytes)];
    }

    /** Validate top-level ISO-BMFF box boundaries without needing a GD/AV1 decoder. */
    private static function isoBoxes(string $bytes): array
    {
        $boxes = [];
        $offset = 0;
        $length = strlen($bytes);
        while ($offset < $length) {
            if ($length - $offset < 8) throw new \InvalidArgumentException('媒体文件已截断');
            $size = unpack('N', substr($bytes, $offset, 4))[1];
            $type = substr($bytes, $offset + 4, 4);
            $header = 8;
            if ($size === 1) {
                if ($length - $offset < 16) throw new \InvalidArgumentException('媒体文件已截断');
                $large = unpack('Nhigh/Nlow', substr($bytes, $offset + 8, 8));
                if ($large['high'] !== 0) throw new \InvalidArgumentException('媒体文件过大');
                $size = $large['low'];
                $header = 16;
            } elseif ($size === 0) $size = $length - $offset;
            if ($size < $header || $size > $length - $offset) throw new \InvalidArgumentException('媒体文件结构不正确');
            $boxes[$type][] = substr($bytes, $offset + $header, $size - $header);
            $offset += $size;
        }
        return $boxes;
    }

    /** Validate a static SVG subset without rewriting even one byte of an accepted file. */
    public static function validateSvg(string $bytes): void
    {
        if (strlen($bytes) > 2 * 1024 * 1024 || preg_match('/<!DOCTYPE|<!ENTITY/i', $bytes)) throw new \InvalidArgumentException('SVG不允许实体或文档类型声明，大小不得超过2MB');
        if (!class_exists(\DOMDocument::class)) throw new \InvalidArgumentException('服务器未启用SVG安全解析组件');
        $old = libxml_use_internal_errors(true);
        $source = new \DOMDocument();
        try {
            if (!$source->loadXML($bytes, LIBXML_NONET | LIBXML_NOBLANKS) || !$source->documentElement ||
                $source->documentElement->localName !== 'svg' || !in_array($source->documentElement->namespaceURI, ['', 'http://www.w3.org/2000/svg', null], true)) {
                throw new \InvalidArgumentException('SVG文件格式不正确');
            }
        } finally { libxml_clear_errors(); libxml_use_internal_errors($old); }
        $elements = array_flip(explode(' ', 'svg g defs title desc path rect circle ellipse line polyline polygon text tspan textPath use symbol clipPath mask linearGradient radialGradient stop pattern marker'));
        $attributes = array_flip(explode(' ', 'id x y x1 x2 y1 y2 cx cy r rx ry width height viewBox preserveAspectRatio d points transform fill fill-opacity fill-rule stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin stroke-miterlimit stroke-dasharray stroke-dashoffset opacity color clip-path clip-rule mask font-family font-size font-weight font-style text-anchor dominant-baseline dx dy rotate textLength lengthAdjust offset stop-color stop-opacity gradientUnits gradientTransform spreadMethod fx fy fr patternUnits patternContentUnits patternTransform markerWidth markerHeight refX refY orient markerUnits marker-start marker-mid marker-end'));
        $count = 0;
        $check = function ($node, $depth) use (&$check, &$count, $elements, $attributes) {
            if (++$count > 10000 || $depth > 64) throw new \InvalidArgumentException('SVG结构过于复杂');
            if ($node instanceof \DOMText || $node instanceof \DOMCdataSection || $node instanceof \DOMComment) return;
            if (!$node instanceof \DOMElement || !isset($elements[$node->localName]) ||
                !in_array($node->namespaceURI, ['', 'http://www.w3.org/2000/svg', null], true)) throw new \InvalidArgumentException('SVG含不支持的元素或可执行内容');
            foreach ($node->attributes as $attribute) {
                $name = $attribute->localName;
                $value = trim($attribute->value);
                if (!$attribute->namespaceURI && in_array($name, ['version', 'class', 'role', 'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-hidden', 'focusable', 'tabindex'], true)) {
                    if (strlen($value) > 2048 || preg_match('/[\x00-\x1f]/', $value)) throw new \InvalidArgumentException('SVG属性内容不正确');
                } elseif ($name === 'href' && in_array($attribute->namespaceURI, [null, '', 'http://www.w3.org/1999/xlink'], true)) {
                    if (!preg_match('/^#[a-zA-Z_][\w.-]*$/D', $value)) throw new \InvalidArgumentException('SVG不允许外部资源引用');
                } elseif (!$attribute->namespaceURI && isset($attributes[$name])) {
                    if (!self::safeSvgValue($value)) throw new \InvalidArgumentException('SVG属性包含不安全内容');
                } elseif (!$attribute->namespaceURI && $name === 'style') {
                    foreach (explode(';', $value) as $declaration) {
                        if (trim($declaration) === '') continue;
                        $pair = explode(':', $declaration, 2);
                        if (count($pair) !== 2 || !isset($attributes[trim($pair[0])]) || !self::safeSvgValue(trim($pair[1]))) throw new \InvalidArgumentException('SVG样式包含不安全内容');
                    }
                } elseif ($attribute->namespaceURI === 'http://www.w3.org/XML/1998/namespace' && $name === 'space' && in_array($value, ['default', 'preserve'], true)) {
                    continue;
                } else throw new \InvalidArgumentException('SVG含不支持的属性或事件');
            }
            foreach ($node->childNodes as $child) $check($child, $depth + 1);
        };
        foreach ($source->childNodes as $node) {
            if ($node instanceof \DOMElement) $check($node, 0);
            elseif (!$node instanceof \DOMComment) throw new \InvalidArgumentException('SVG不允许处理指令');
        }
    }

    private static function safeSvgValue(string $value): bool
    {
        if (preg_match('/[\\\\\x00-\x1f<>@]|(?:javascript|data|https?|file):|expression|\/\*/i', $value)) return false;
        if (stripos($value, 'url') !== false && !preg_match('/^url\(\s*#[a-zA-Z_][\w.-]*\s*\)$/D', $value)) return false;
        return true;
    }
}
