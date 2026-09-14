"""Isolated Chromium regression; run product_description.cjs first to build layout HTML.

Requires the crawler dependencies and Chromium. --live optionally diagnoses the reported
JD URL using a temporary, unauthenticated profile; it never solves verification.
"""
import json
import sys
import time
from pathlib import Path
from urllib.parse import quote

from DrissionPage import Chromium, ChromiumOptions
from jd_crawler.extractor import classify_page, extract_product, product_page_ready, ExtractionError

root = Path(__file__).resolve().parents[2]
# auto_port also allocates a fresh profile, so the test cannot attach to the login browser.
options = ChromiumOptions().auto_port().headless()
options.set_argument('--no-sandbox').set_argument('--disable-dev-shm-usage')
browser = Chromium(options)
tab = browser.latest_tab
try:
    modern = (root / 'tests/regression/fixtures/jd-modern-item.html').read_text()
    modern = modern.replace('<head>', '<head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'">')
    tab.get('data:text/html;charset=utf-8,' + quote(modern))
    assert product_page_ready(tab)
    product = extract_product(tab, 'https://item.jd.com/10119564643643.html', 0.05)
    assert product['title'] == '实木书桌', product
    assert len(product['images']) == 1, product
    assert len(product['detail_images']) == 5, product
    print('PASS: Chromium extracts the modern JD fixture: SKU title, 1 gallery image, 5 ordered details')

    layout = (root / '.build/jd-fix/description-layout.html').read_text()
    tab.get('data:text/html;charset=utf-8,' + quote(layout))
    for width in (320, 375, 430, 1024):
        tab.run_cdp('Emulation.setDeviceMetricsOverride', width=width, height=900, deviceScaleFactor=1, mobile=False)
        data = tab.run_js('''return Array.from(document.images).map(img => ({width:img.getBoundingClientRect().width,
            height:img.getBoundingClientRect().height, naturalWidth:img.naturalWidth, naturalHeight:img.naturalHeight,
            parent:img.parentElement.getBoundingClientRect().width, right:img.getBoundingClientRect().right,
            screen:document.documentElement.clientWidth}));''')
        for img in data:
            assert img['naturalWidth'] > 0, data
            assert abs(img['width'] - img['screen']) < 1, data
            assert abs(img['width'] - img['parent']) < 1, data
            assert abs(img['height'] - img['width'] * img['naturalHeight'] / img['naturalWidth']) < 1, data
            assert img['right'] <= img['screen'], data
        print(f'PASS: {width}px viewport, narrow/tall images fill width without cropping or distortion')
    tab.run_cdp('Emulation.clearDeviceMetricsOverride')
    if '--live' in sys.argv:
        tab.get('https://item.jd.com/10119564643643.html', timeout=25)
        deadline = time.monotonic() + 30
        while time.monotonic() < deadline:
            try:
                classify_page(tab)
            except ExtractionError as error:
                print('LIVE:', error.code)
                break
            if product_page_ready(tab):
                live = extract_product(tab, 'https://item.jd.com/10119564643643.html', 0.2)
                print('LIVE:', json.dumps({k:live[k] for k in ['sku_id','title','warnings']},ensure_ascii=False),
                      'gallery=',len(live['images']), 'details=',len(live['detail_images']))
                break
            time.sleep(1)
        else:
            print('LIVE: product data unavailable in fresh browser; title=', tab.title)
finally:
    browser.quit()
