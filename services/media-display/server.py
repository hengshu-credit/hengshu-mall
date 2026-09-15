"""Read-only AVIF display renditions for older Android WebViews. Never fetch URLs."""
import hashlib
import io
import os
import re
import threading
import warnings
from collections import OrderedDict
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

from PIL import Image, ImageOps, features

Image.MAX_IMAGE_PIXELS = 20_000_000
warnings.simplefilter('error', Image.DecompressionBombWarning)
ROOT = Path(os.environ.get('MEDIA_ROOT', '/media')).resolve()
WORKERS = threading.BoundedSemaphore(2)
CACHE = OrderedDict()
CACHE_LOCK = threading.Lock()
CACHE_BYTES = 32 * 1024 * 1024
IMAGE_LOCKS = [threading.Lock() for _ in range(32)]


def rendition(root, request_path, output_format='png'):
    if output_format not in ('png', 'auto', 'avif'):
        raise ValueError('Unsupported output format')
    root = root.resolve()
    if urlsplit(request_path).scheme or urlsplit(request_path).netloc:
        raise ValueError('Only local paths are supported')
    path = unquote(urlsplit(request_path).path)
    if not path.startswith('/uploads/') or '\\' in path or '\x00' in path:
        raise ValueError('Unsupported image path')
    relative = path[len('/uploads/'):]
    if '..' in Path(relative).parts:
        raise ValueError('Invalid path')
    source = (root / relative).resolve()
    if not source.is_relative_to(root) or source.suffix.lower() != '.avif':
        raise ValueError('Unsupported image path')
    stat = source.stat()
    if not source.is_file() or stat.st_size > 20 * 1024 * 1024:
        raise ValueError('Invalid image size')
    key = (str(source), stat.st_mtime_ns, stat.st_size, output_format)
    with CACHE_LOCK:
        cached = CACHE.get(key)
        if cached:
            CACHE.move_to_end(key)
            return cached
    # Coalesce identical cold reads, but don't make cache hits or slow clients
    # occupy a decoder slot. Keep both memory and active conversions bounded.
    lock = IMAGE_LOCKS[hash(key) % len(IMAGE_LOCKS)]
    if not lock.acquire(timeout=8):
        raise TimeoutError('Image busy')
    try:
        with CACHE_LOCK:
            if key in CACHE:
                CACHE.move_to_end(key)
                return CACHE[key]
        if not WORKERS.acquire(timeout=8):
            raise TimeoutError('Image busy')
        try:
            with Image.open(source) as original:
                if original.format != 'AVIF':
                    raise ValueError('Invalid AVIF content')
                if output_format == 'avif':
                    # Header validation only: capable renderers receive the
                    # exact upload bytes without decoding or re-encoding them.
                    result = source.read_bytes()
                else:
                    image = ImageOps.exif_transpose(original)
                    image.thumbnail((2048, 2048))
                    transparent = 'A' in image.getbands() and image.getchannel('A').getextrema()[0] < 255
                    image = image.convert('RGBA' if transparent else 'RGB')
                    buffer = io.BytesIO()
                    if output_format == 'auto' and not transparent:
                        # JPEG also decodes on older iOS/Android engines. Keep
                        # PNG for alpha images and previously shipped App URLs.
                        image.save(buffer, format='JPEG', quality=90, subsampling=0, optimize=True)
                    else:
                        image.save(buffer, format='PNG')
                    result = buffer.getvalue()
        finally:
            WORKERS.release()
        with CACHE_LOCK:
            CACHE[key] = result
            while sum(map(len, CACHE.values())) > CACHE_BYTES:
                CACHE.popitem(last=False)
        return result
    finally:
        lock.release()


def image_request(request_path):
    if len(request_path) > 2048:
        raise ValueError('Invalid path')
    url = urlsplit(request_path)
    if url.scheme or url.netloc or url.fragment:
        raise ValueError('Only local paths are supported')
    query = parse_qs(url.query, keep_blank_values=True)
    if any(len(values) != 1 for values in query.values()):
        raise ValueError('Duplicate parameter')
    if url.path == '/api/media/image':
        if set(query) - {'path', 'format'}:
            raise ValueError('Invalid parameter')
        path = query.get('path', [''])[0]
        if len(path) > 600 or not re.fullmatch(r'/uploads/[a-zA-Z0-9_/-]+\.avif', path, re.I) or '..' in path:
            raise ValueError('Invalid image path')
    else:
        if set(query) - {'format'}:
            raise ValueError('Invalid parameter')
        path = url.path
    output_format = query.get('format', ['png'])[0]
    if output_format not in ('png', 'auto'):
        raise ValueError('Unsupported output format')
    return path, output_format


def accepts_avif(accept):
    # Wildcards don't prove decoder support; require the explicit media type.
    for item in accept.lower().split(','):
        parts = [part.strip() for part in item.split(';')]
        if parts[0] != 'image/avif':
            continue
        quality = next((part.split('=', 1)[1].strip() for part in parts[1:] if part.startswith('q=')), '1')
        try:
            return 0 < float(quality) <= 1
        except ValueError:
            return False
    return False


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200 if features.check('avif') else 503)
            self.end_headers()
            self.wfile.write(b'media-display')
            return
        try:
            path, output_format = image_request(self.path)
            if output_format == 'auto' and accepts_avif(self.headers.get('Accept', '')):
                output_format = 'avif'
            body = rendition(ROOT, path, output_format)
            etag = '"' + hashlib.sha256(body).hexdigest() + '"'
            if self.headers.get('If-None-Match') == etag:
                self.send_response(304)
                self.send_header('Cache-Control', 'public, max-age=86400')
                self.send_header('ETag', etag)
                self.send_header('Vary', 'Accept')
                self.end_headers()
                return
            self.send_response(200)
            content_type = 'image/avif' if output_format == 'avif' else ('image/jpeg' if body.startswith(b'\xff\xd8\xff') else 'image/png')
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'public, max-age=86400')
            self.send_header('ETag', etag)
            self.send_header('Vary', 'Accept')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.end_headers()
            self.wfile.write(body)
        except TimeoutError:
            self.send_error(503, 'Image busy')
        except (OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
            self.send_error(404, 'Image unavailable')


if __name__ == '__main__':
    ThreadingHTTPServer(('0.0.0.0', int(os.environ.get('PORT', 8092))), Handler).serve_forever()
