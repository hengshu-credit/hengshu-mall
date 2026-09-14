"""Read-only AVIF display renditions for older Android WebViews. Never fetch URLs."""
import hashlib
import io
import os
import threading
import warnings
from collections import OrderedDict
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

from PIL import Image, ImageOps, features

Image.MAX_IMAGE_PIXELS = 20_000_000
warnings.simplefilter('error', Image.DecompressionBombWarning)
ROOT = Path(os.environ.get('MEDIA_ROOT', '/media')).resolve()
WORKERS = threading.BoundedSemaphore(2)
CACHE = OrderedDict()
CACHE_LOCK = threading.Lock()
CACHE_BYTES = 32 * 1024 * 1024


def rendition(root, request_path):
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
    key = (str(source), stat.st_mtime_ns, stat.st_size)
    with CACHE_LOCK:
        cached = CACHE.get(key)
        if cached:
            CACHE.move_to_end(key)
            return cached
    with Image.open(source) as original:
        if original.format != 'AVIF':
            raise ValueError('Invalid AVIF content')
        image = ImageOps.exif_transpose(original)
        image.thumbnail((2048, 2048))
        image = image.convert('RGBA' if 'A' in image.getbands() else 'RGB')
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        result = buffer.getvalue()
    with CACHE_LOCK:
        CACHE[key] = result
        while sum(map(len, CACHE.values())) > CACHE_BYTES:
            CACHE.popitem(last=False)
    return result


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200 if features.check('avif') else 503)
            self.end_headers()
            self.wfile.write(b'media-display')
            return
        # A page requests several gallery/card images together. Queue briefly
        # instead of turning ordinary parallel image loads into broken images.
        if not WORKERS.acquire(timeout=8):
            self.send_error(503)
            return
        try:
            body = rendition(ROOT, self.path)
            etag = '"' + hashlib.sha256(body).hexdigest() + '"'
            if self.headers.get('If-None-Match') == etag:
                self.send_response(304)
                self.end_headers()
                return
            self.send_response(200)
            self.send_header('Content-Type', 'image/png')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'public, max-age=3600')
            self.send_header('ETag', etag)
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.end_headers()
            self.wfile.write(body)
        except (OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
            self.send_error(404, 'Image unavailable')
        finally:
            WORKERS.release()


if __name__ == '__main__':
    ThreadingHTTPServer(('0.0.0.0', int(os.environ.get('PORT', 8092))), Handler).serve_forever()
