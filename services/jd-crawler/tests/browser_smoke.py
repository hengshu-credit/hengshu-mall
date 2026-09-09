"""Optional real Chromium DOM check; no JD login or live product is used.

Copy this file into the service container, then execute it with Python.
"""
import json
from urllib.parse import quote

from DrissionPage import Chromium
from jd_crawler.extractor import extract_product


HTML = '''<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
</head><body>
<h1>京东采集合成验收商品 500ml 蓝色</h1><span>￥129.50</span>
<div class="image-carousel-track"><div class="item"><img data-origin="https://img10.360buyimg.com/n1/jfs/test.jpg.avif"></div></div>
<div class="attribute"><div class="list"><div class="item"><span>品牌</span><span>合成测试</span></div></div></div>
<div class="page-right-spec"><div class="specification-group"><span class="specification-group-label">容量</span>
<div class="specification-item-sku selected"><span class="specification-item-sku-text">500ml</span></div></div></div>
<video preload="none"><source src="https://jdvideo.jd.com/fixture/product.webm" type="video/webm"></video>
<div class="ssd-module" style="height:1200px;background-image:url(https://img30.360buyimg.com/sku/jfs/detail.jpg.avif)"></div>
</body></html>'''


if __name__ == '__main__':
    browser = Chromium('127.0.0.1:9222')
    tab = browser.new_tab()
    try:
        tab.get('data:text/html;charset=utf-8,' + quote(HTML))
        result = extract_product(tab, 'https://item.jd.com/1000123.html', 0.05)
        assert result['title'] == '京东采集合成验收商品 500ml 蓝色', result
        assert result['price'] == 129.5, result
        assert result['images'] == ['https://img10.360buyimg.com/n1/jfs/test.jpg.avif'], result
        assert result['detail_images'] == ['https://img30.360buyimg.com/sku/jfs/detail.jpg.avif'], result
        assert {'name': '品牌', 'value': '合成测试'} in result['attributes'], result
        assert result['selected_specs'] == [{'name': '容量', 'value': '500ml'}], result
        assert result['video_link'] == 'https://jdvideo.jd.com/fixture/product.webm', result
        print(json.dumps(result, ensure_ascii=False))
        print('PASS: real Chromium executes the vendored DOM helpers with native AVIF and WebM material')
    finally:
        tab.close()
