import hashlib
import importlib.util
import io
import pathlib
import tempfile
import threading
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from http.server import ThreadingHTTPServer
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from PIL import Image

root = pathlib.Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('display', root / 'services/media-display/server.py')
display = importlib.util.module_from_spec(spec)
spec.loader.exec_module(display)


class DisplayTests(unittest.TestCase):
    def setUp(self):
        with display.CACHE_LOCK:
            display.CACHE.clear()

    def test_avif_rendition_preserves_source_and_invalidates_cache(self):
        with tempfile.TemporaryDirectory() as directory:
            uploads = pathlib.Path(directory)
            source = uploads / '商品.avif'
            Image.new('RGB', (40, 30), 'red').save(source, format='AVIF')
            digest = hashlib.sha256(source.read_bytes()).digest()
            data = display.rendition(uploads, '/uploads/%E5%95%86%E5%93%81.avif')
            image = Image.open(io.BytesIO(data))
            self.assertEqual(image.format, 'PNG')
            self.assertEqual(image.size, (40, 30))
            self.assertGreater(image.getpixel((10, 10))[0], 240)
            self.assertEqual(hashlib.sha256(source.read_bytes()).digest(), digest)
            self.assertEqual(display.rendition(uploads, '/uploads/商品.avif'), data)
            Image.new('RGB', (20, 20), 'blue').save(source, format='AVIF')
            changed = display.rendition(uploads, '/uploads/商品.avif')
            self.assertNotEqual(data, changed)

    def test_only_local_avif_images_are_read(self):
        with tempfile.TemporaryDirectory() as directory:
            uploads = pathlib.Path(directory)
            for path in ['/etc/passwd', '/uploads/../secret.avif', '/uploads/%2e%2e/secret.avif', '/uploads/x.png', '/uploads/C:%5csecret.avif', '/uploads/%00.avif', 'https://remote.test/image.avif']:
                with self.subTest(path=path), self.assertRaises(ValueError):
                    display.rendition(uploads, path)
            (uploads / 'fake.avif').write_text('not an image')
            with self.assertRaises(OSError):
                display.rendition(uploads, '/uploads/fake.avif')

    def test_auto_format_preserves_dimensions_transparency_and_legacy_png(self):
        with tempfile.TemporaryDirectory() as directory:
            uploads = pathlib.Path(directory)
            Image.new('RGB', (3000, 1500), 'red').save(uploads / 'opaque.avif')
            source_hash = hashlib.sha256((uploads / 'opaque.avif').read_bytes()).digest()
            compact = display.rendition(uploads, '/uploads/opaque.avif', 'auto')
            legacy = display.rendition(uploads, '/uploads/opaque.avif')
            for body, format in [(compact, 'JPEG'), (legacy, 'PNG')]:
                image = Image.open(io.BytesIO(body))
                self.assertEqual(image.format, format)
                self.assertEqual(image.size, (2048, 1024))
                self.assertGreater(image.getpixel((10, 10))[0], 240)
            self.assertEqual(source_hash, hashlib.sha256((uploads / 'opaque.avif').read_bytes()).digest())
            Image.new('RGBA', (64, 48), (20, 50, 80, 120)).save(uploads / 'alpha.avif')
            alpha = Image.open(io.BytesIO(display.rendition(uploads, '/uploads/alpha.avif', 'auto')))
            self.assertEqual(alpha.format, 'PNG')
            self.assertEqual(alpha.getpixel((10, 10))[3], 120)

    def test_cold_duplicate_requests_decode_once_and_hot_reads_bypass_workers(self):
        with tempfile.TemporaryDirectory() as directory:
            uploads = pathlib.Path(directory)
            Image.new('RGB', (80, 60), 'blue').save(uploads / 'a.avif')
            original_open = display.Image.open
            def slow_open(*args, **kwargs):
                time.sleep(0.05)
                return original_open(*args, **kwargs)
            with patch.object(display.Image, 'open', side_effect=slow_open) as opened:
                with ThreadPoolExecutor(max_workers=12) as pool:
                    bodies = list(pool.map(lambda _: display.rendition(uploads, '/uploads/a.avif', 'auto'), range(12)))
                self.assertEqual(opened.call_count, 1)
                self.assertTrue(all(body == bodies[0] for body in bodies))
            with patch.object(display, 'WORKERS') as workers:
                self.assertEqual(display.rendition(uploads, '/uploads/a.avif', 'auto'), bodies[0])
                workers.acquire.assert_not_called()
            with patch.object(display, 'CACHE_BYTES', 1):
                display.rendition(uploads, '/uploads/a.avif')
                self.assertLessEqual(sum(map(len, display.CACHE.values())), 1)

    def test_public_api_content_type_etag_and_path_validation(self):
        with tempfile.TemporaryDirectory() as directory:
            uploads = pathlib.Path(directory)
            Image.new('RGB', (80, 60), 'blue').save(uploads / 'a.avif')
            class QuietHandler(display.Handler):
                def log_message(self, *args):
                    pass
            server = ThreadingHTTPServer(('127.0.0.1', 0), QuietHandler)
            worker = threading.Thread(target=server.serve_forever, daemon=True)
            worker.start()
            origin = 'http://127.0.0.1:' + str(server.server_port)
            try:
                with patch.object(display, 'ROOT', uploads):
                    for suffix, accept, content_type in [('', 'image/avif', 'image/png'), ('&format=auto', '*/*', 'image/jpeg'), ('&format=auto', 'image/avif,image/webp,*/*', 'image/avif'), ('&format=auto', 'image/avif;q=0,image/*', 'image/jpeg')]:
                        url = origin + '/api/media/image?path=%2Fuploads%2Fa.avif' + suffix
                        with urlopen(Request(url, headers={'Accept': accept})) as response:
                            self.assertEqual(response.headers['Content-Type'], content_type)
                            body = response.read()
                            if content_type == 'image/avif':
                                self.assertEqual(body, (uploads / 'a.avif').read_bytes(), 'AVIF-capable clients receive exact original bytes')
                            self.assertEqual(response.headers['Vary'], 'Accept')
                            self.assertEqual(Image.open(io.BytesIO(body)).size, (80, 60))
                            self.assertEqual(int(response.headers['Content-Length']), len(body))
                            etag = response.headers['ETag']
                        with self.assertRaises(HTTPError) as unchanged:
                            urlopen(Request(url, headers={'If-None-Match': etag, 'Accept': accept}))
                        self.assertEqual(unchanged.exception.code, 304)
                        self.assertEqual(unchanged.exception.read(), b'')
                        self.assertIn('max-age=86400', unchanged.exception.headers['Cache-Control'])
                    for query in ['path=/uploads/../secret.avif', 'path=https://remote.test/a.avif',
                                  'path=/uploads/a.avif&format=gif', 'path=/uploads/a.png',
                                  'path=/uploads/a.avif&path=/uploads/b.avif', 'path=/uploads/a.avif&url=http://remote.test']:
                        with self.subTest(query=query), self.assertRaises(HTTPError) as rejected:
                            urlopen(origin + '/api/media/image?' + query)
                        self.assertEqual(rejected.exception.code, 404)
            finally:
                server.shutdown()
                server.server_close()
                worker.join()

    def test_original_requires_explicit_decoder_support(self):
        for accept in ['', '*/*', 'image/*', 'image/avif;q=0', 'image/avif;q=invalid', 'image/avif;q=2']:
            self.assertFalse(display.accepts_avif(accept))
        for accept in ['image/avif', 'image/png, image/avif;q=0.8', 'IMAGE/AVIF']:
            self.assertTrue(display.accepts_avif(accept))


if __name__ == '__main__':
    unittest.main()
