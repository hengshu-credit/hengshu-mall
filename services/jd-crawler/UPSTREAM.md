# Upstream provenance

- Repository: https://github.com/CherryPainter/jd-product-crawler
- Source: `scripts/jd_product_detail.py` from the `main` branch, retrieved 2026-09-09
- Full source SHA-256: `143ebf3162800688a04189d87aabd65cf1955349cff898890fe252cd881d1a10`
- License: MIT; preserved in `LICENSE.upstream`

`src/jd_crawler/vendor/cherrypainter_dom.py` contains only the upstream
`_extract_all_by_js`, `_extract_detail_images_by_js`, and
`_slow_scroll_to_load` methods. The upstream `run()` and `_build_sku_list()`
are intentionally excluded because they synthesize price-adjacent commerce
data. The service maps only values present on the current item page.

Local fixes broaden description extraction to ordered native `img`/lazy attributes
and CSS background layers within description containers, and use immediate scroll
steps so lazy loading is not skipped by overlapping animations. Gallery selection
prefers observed zoom/original/srcset sources. For JD thumbnail paths, the static
asset candidate is used only after browser decoding confirms greater dimensions;
the original URL remains the fallback. No media bytes are resized or transcoded.
