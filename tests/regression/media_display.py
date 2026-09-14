import hashlib
import importlib.util
import io
import pathlib
import tempfile
import unittest

from PIL import Image

root = pathlib.Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('display', root / 'services/media-display/server.py')
display = importlib.util.module_from_spec(spec)
spec.loader.exec_module(display)


class DisplayTests(unittest.TestCase):
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


if __name__ == '__main__':
    unittest.main()
