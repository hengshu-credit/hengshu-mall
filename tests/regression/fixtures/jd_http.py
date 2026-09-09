import base64
import gzip
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

TASK = '11111111-2222-4333-8444-555555555555'
PRODUCT = {'sku_id': '1000123', 'source_url': 'https://item.jd.com/1000123.html', 'title': '合成测试商品', 'price': 129.5,
           'images': ['https://img10.360buyimg.com/n1/jfs/test.jpg'], 'detail_images': [], 'attributes': [], 'selected_specs': [], 'warnings': []}

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args): pass
    def reply(self, status, data):
        encoded = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)
    def do_GET(self):
        if self.path in ('/native.avif', '/native.webm'):
            extension = self.path.rsplit('.', 1)[1]
            media = (Path(__file__).parent / 'media' / ('tiny.' + extension)).read_bytes()
            self.send_response(200)
            self.send_header('Content-Type', {'avif': 'image/avif', 'webm': 'video/webm'}[extension])
            self.send_header('Content-Length', str(len(media)))
            self.end_headers(); self.wfile.write(media); return
        if self.path in ('/fixture.png', '/compressed.png'):
            image = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=')
            self.send_response(200)
            if self.path == '/compressed.png':
                image = gzip.compress(image)
                self.send_header('Content-Encoding', 'gzip')
            self.send_header('Content-Type', 'image/png'); self.send_header('Content-Length', str(len(image))); self.end_headers(); self.wfile.write(image); return
        if self.path == '/missing.png':
            return self.reply(404, {'error': {'code': 'not_found'}})
        if self.headers.get('Authorization') != 'Bearer ' + 't' * 32:
            return self.reply(401, {'error': {'code': 'unauthorized'}})
        self.reply(200, {'job_id': TASK, 'state': 'succeeded', 'product': PRODUCT})
    def do_POST(self):
        if self.headers.get('Authorization') != 'Bearer ' + 't' * 32:
            return self.reply(401, {'error': {'code': 'unauthorized'}})
        body = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))))
        if body.get('url') != PRODUCT['source_url']:
            return self.reply(422, {'error': {'code': 'invalid_url'}})
        self.reply(202, {'job_id': TASK, 'state': 'queued'})

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8099)
    args = parser.parse_args()
    print(f'Synthetic-only HTTP fixture on {args.port}', flush=True)
    ThreadingHTTPServer(('0.0.0.0', args.port), Handler).serve_forever()
