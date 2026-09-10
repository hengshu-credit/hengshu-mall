"""Safe adapter around the vendored DOM-only upstream methods."""

from __future__ import annotations

import json
import re
from urllib.parse import urlsplit

from .contract import ContractError, canonicalize_item_url, map_product, normalize_media_url
from .vendor.cherrypainter_dom import UpstreamDomExtractors


class ExtractionError(RuntimeError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def classify_page(tab: object) -> None:
    current_url = str(getattr(tab, "url", "") or "")
    title = str(getattr(tab, "title", "") or "").lower()
    host = (urlsplit(current_url).hostname or "").lower()
    if host in {"passport.jd.com", "plogin.m.jd.com"} or "login" in urlsplit(current_url).path.lower():
        raise ExtractionError("login_required", "Log in to JD in the crawler browser, then retry.")
    if "reason=403" in current_url or any(term in title for term in ("安全验证", "人机验证", "滑块验证", "验证码", "captcha")):
        raise ExtractionError("verification_required", "Complete JD verification in the crawler browser, then retry.")
    try:
        verification = tab.run_js(
            "return Boolean(document.querySelector("
            "'.jdcrawlerJRV-slide,.slide-verify,#captcha,#jdcrawlerJRV-wrap,.jdcrawlerJRV-main,[class*=captcha]'"
            "));"
        )
    except Exception:
        verification = False
    if verification:
        raise ExtractionError("verification_required", "Complete JD verification in the crawler browser, then retry.")
    if host and host != "item.jd.com":
        raise ExtractionError("verification_required", "Open the JD item page in the crawler browser, then retry.")


def validate_final_item(tab: object, expected_url: str) -> None:
    try:
        actual_url = canonicalize_item_url(str(getattr(tab, "url", "") or ""))
    except ContractError as exc:
        raise ExtractionError("extraction_failed", "JD did not finish on the requested item page.") from exc
    if actual_url != expected_url:
        raise ExtractionError("extraction_failed", "JD opened a different item than requested.")


def _extract_native_gallery(tab: object) -> list[str]:
    script = r"""
var urls = [];
var seen = {};
function nativeSrc(img) {
    if (!img) return '';
    var original = img.getAttribute('data-origin') || img.getAttribute('data-original') ||
        img.getAttribute('data-large') || img.getAttribute('data-big') ||
        img.getAttribute('jqimg') || img.getAttribute('data-zoom-image');
    if (original) return original;
    var srcset = img.getAttribute('data-srcset') || img.getAttribute('srcset') || '';
    var candidates = srcset.split(',').map(function(part) {
        var bits = part.trim().split(/\s+/); return {url: bits[0], size: parseFloat(bits[1]) || 0};
    }).filter(function(part) { return part.url; });
    candidates.sort(function(a, b) { return b.size - a.size; });
    return (candidates[0] && candidates[0].url) || img.getAttribute('data-lazyload') ||
        img.getAttribute('data-src') || img.currentSrc || img.getAttribute('src') || '';
}
function add(img, filterTools) {
    if (!img) return;
    var classes = String(img.className || '').toLowerCase();
    if (filterTools && (classes.indexOf('play') > -1 || classes.indexOf('icon') > -1)) return;
    var value = nativeSrc(img).trim();
    var lowered = value.toLowerCase();
    if (filterTools && (lowered.indexOf('shaidan') > -1 || lowered.indexOf('imagetools') > -1)) return;
    var key = value.replace(/^.*(?:\/jfs\/|_jfs\/)/, 'jfs/');
    if (value && !seen[key]) {
        seen[key] = true;
        urls.push(value);
    }
}
add(document.querySelector('#spec-img'), false);
var carousel = document.querySelectorAll('#spec-list img, .spec-list img, .image-carousel-track .item img, [class*="image-carousel-track"] .item img');
for (var i = 0; i < carousel.length; i++) add(carousel[i], true);
if (carousel.length === 0) {
    var fallback = document.querySelectorAll('[class*="_gallery_"] img, .image-carousel img');
    for (var j = 0; j < fallback.length; j++) add(fallback[j], true);
}
return JSON.stringify(urls);
"""
    try:
        raw = tab.run_js(script)
        values = json.loads(raw) if isinstance(raw, str) else raw
    except (TypeError, ValueError, AttributeError):
        return []
    if not isinstance(values, list):
        return []
    return [value for value in values if isinstance(value, str)]


def original_image_candidate(value: str) -> str | None:
    """Try JD's static asset path only for known thumbnail paths; keep format/query intact."""
    value = normalize_media_url(value)
    if not value:
        return None
    parts = urlsplit(value)
    if not (parts.hostname or '').endswith('.360buyimg.com'):
        return None
    match = re.fullmatch(r'/n[0-9]+/(?:s[0-9]+x[0-9]+_)?jfs/(.+)', parts.path)
    if not match:
        match = re.fullmatch(r'/n[0-9]+/s[0-9]+x[0-9]+/jfs/(.+)', parts.path)
    if not match:
        return None
    return parts._replace(path='/imgzone/jfs/' + match[1]).geturl()


def _prefer_full_size_gallery(tab: object, urls: list[str]) -> list[str]:
    """Only select a source that the browser loads and verifies is at least as large."""
    pairs = [[url, original_image_candidate(url)] for url in urls[:30]]
    script = r"""
const pairs = arguments[0];
function measure(url) {
    return new Promise(resolve => {
        if (!url) return resolve(null);
        const img = new Image();
        const timer = setTimeout(() => { img.src = ''; resolve(null); }, 5000);
        img.onload = () => { clearTimeout(timer); resolve({url, w: img.naturalWidth, h: img.naturalHeight}); };
        img.onerror = () => { clearTimeout(timer); resolve(null); };
        img.src = url;
    });
}
return Promise.all(pairs.map(async pair => {
    if (!pair[1] || pair[0] === pair[1]) return pair[0];
    const [current, original] = await Promise.all(pair.map(measure));
    return current && original && original.w >= current.w && original.h >= current.h &&
        (original.w > current.w || original.h > current.h) ? original.url : pair[0];
}));
"""
    try:
        result = tab.run_js(script, pairs)
        if isinstance(result, list) and len(result) == len(pairs):
            return [value if value in pair else pair[0] for value, pair in zip(result, pairs)] + urls[30:]
    except Exception:
        pass
    return urls


def _extract_video_candidates(tab: object) -> list[str]:
    script = r"""
var urls = [];
function add(value) {
    if (typeof value === 'string' && value.trim()) urls.push(value.trim());
}
var videos = document.querySelectorAll('video');
for (var i = 0; i < videos.length; i++) {
    add(videos[i].currentSrc);
    add(videos[i].src);
    add(videos[i].getAttribute('src'));
    add(videos[i].getAttribute('data-src'));
    add(videos[i].getAttribute('data-video'));
    add(videos[i].getAttribute('data-video-url'));
}
var sources = document.querySelectorAll('video source');
for (var j = 0; j < sources.length; j++) {
    add(sources[j].src);
    add(sources[j].getAttribute('src'));
    add(sources[j].getAttribute('data-src'));
}
return JSON.stringify(urls);
"""
    try:
        raw = tab.run_js(script)
        values = json.loads(raw) if isinstance(raw, str) else raw
    except (TypeError, ValueError, AttributeError):
        return []
    if not isinstance(values, list):
        return []
    return [value for value in values if isinstance(value, str)]


def extract_product(
    tab: object,
    source_url: str,
    scroll_pause: float,
    extractor_class: type[UpstreamDomExtractors] = UpstreamDomExtractors,
) -> dict[str, object]:
    extractor = extractor_class()
    extractor.page = tab
    extractor.scroll_pause = scroll_pause
    native_gallery = _extract_native_gallery(tab)
    raw = extractor._extract_all_by_js()
    if isinstance(raw, dict):
        raw = dict(raw)
        raw["native_gallery"] = _prefer_full_size_gallery(tab, native_gallery)
        raw["video_candidates"] = _extract_video_candidates(tab)
    # Reveal description tabs without following shop links or interacting with verification.
    try:
        tab.run_js(r"""
document.querySelectorAll('.tab-main li, .left-tabs-title li, [role="tab"]').forEach(function(el) {
    if (/^(商品详情|商品介绍|详情)$/.test(el.textContent.trim()) && !el.querySelector('a[href^="http"]')) el.click();
});
document.querySelectorAll('#detail button, #J-detail-content button, .detail-content button').forEach(function(el) {
    if (/^(展开全部|展开详情|查看全部详情|展开商品详情)$/.test(el.textContent.trim())) el.click();
});
""")
    except Exception:
        pass
    extractor._slow_scroll_to_load()
    details = extractor._extract_detail_images_by_js()
    return map_product(source_url, raw, details)
