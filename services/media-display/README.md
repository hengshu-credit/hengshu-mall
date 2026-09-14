# Android display images

The service reads AVIF files from the read-only `/media` upload mount and returns PNG display images to older Android WebViews. The source file and the material-library URL stay unchanged. PNG preserves transparency; display renditions are bounded to 2048 × 2048. Images over 20 MB or 20 million pixels are rejected. The service does not fetch remote URLs or read outside the upload mount, including through symlinks. Its in-memory cache is capped at 32 MB and at most two images decode concurrently.

Release Compose builds this service automatically. Nginx maps `/_compat/images/uploads/...avif` to `/uploads/...avif` on port 8092. No host port is exposed. The App request wrapper adapts same-origin `/uploads/` AVIF URLs, including slider images, SKU images and rich-text images. H5, administration and the original uploads retain their original URLs. External object-storage URLs are not proxied; they need a compatible image variant from that storage provider.

Local test:

```powershell
python -m pip install -r services/media-display/requirements.txt
$env:MEDIA_ROOT = 'E:/workspace/CRMEB/crmeb/public/uploads'
python services/media-display/server.py
```

The runtime uses Pillow's AVIF wheel support ([Pillow documentation](https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html#avif)). Tests: `python tests/regression/media_display.py`.
