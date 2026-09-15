# Android display images

The service reads AVIF files from the read-only `/media` upload mount. The source file and the material-library URL stay unchanged. Images over 20 MB or 20 million pixels are rejected. The service does not fetch remote URLs or read outside the upload mount, including through symlinks. Its in-memory cache is capped at 32 MB and at most two images decode concurrently. Concurrent requests for the same cold variant share the conversion; cached responses and socket transfers do not occupy decoder slots.

Release Compose builds this service automatically. Nginx sends the existing `/api/media/image?path=...` entry directly to port 8092, so image loads do not compete with business requests for PHP workers. The previous `/_compat/images/uploads/...avif` path still works. No host port is exposed. The PHP controller remains a fallback for deployments with older Nginx configurations.

Previously shipped URLs without `format` continue returning PNG. New App URLs add `format=auto`: an explicit `image/avif` entry with positive quality in the browser's `Accept` header selects the exact original AVIF bytes, without resizing or transcoding. Other clients receive JPEG (quality 90, no chroma subsampling) for opaque images and PNG for transparent images; those compatibility renditions are bounded to 2048 × 2048. Wildcard Accept headers do not prove AVIF support. Responses send `Vary: Accept`, format-specific ETags and one-day cache headers, including on 304 responses. See [HTTP content negotiation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Content_negotiation).

The App request wrapper adapts same-origin `/uploads/` AVIF URLs, including slider images, SKU images and rich-text images. H5, administration and the original uploads retain their original URLs. External object-storage URLs are not proxied. New App URLs also work with an old server, which ignores the extra parameter and returns its existing PNG rendition.

Local test:

```powershell
python -m pip install -r services/media-display/requirements.txt
$env:MEDIA_ROOT = 'E:/workspace/CRMEB/crmeb/public/uploads'
python services/media-display/server.py
```

The runtime uses Pillow's AVIF wheel support ([Pillow documentation](https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html#avif)). Tests: `python tests/regression/media_display.py`.

Delivery integration: build `docker build -t crmeb-media-loading-test:20260915 services/media-display`, then run `./HBuilderX/plugins/node/node.exe tests/regression/media_delivery.cjs`. This requires the existing public media snapshots in `.build/storefront-audit/media`, `.build/php74/php.exe`, Chrome and `tests/tooling/node_modules/playwright`. It creates a dedicated Docker network and loopback-only ports 18137–18139, tests real release Nginx without a PHP backend, the PHP fallback, original-byte identity, variant caching and Chrome's actual AVIF negotiation/decoding, and removes its containers and network afterward. It does not connect to the running mall's database or deploy changes.
