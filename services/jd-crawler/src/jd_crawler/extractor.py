"""Safe adapter around the vendored DOM-only upstream methods."""

from __future__ import annotations

import json
from urllib.parse import urlsplit

from .contract import ContractError, canonicalize_item_url, map_product
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
    return img.getAttribute('data-origin') || img.getAttribute('data-src') ||
           img.getAttribute('src') || img.currentSrc || '';
}
function add(img, filterTools) {
    if (!img) return;
    var classes = String(img.className || '').toLowerCase();
    if (filterTools && (classes.indexOf('play') > -1 || classes.indexOf('icon') > -1)) return;
    var value = nativeSrc(img).trim();
    var lowered = value.toLowerCase();
    if (filterTools && (lowered.indexOf('shaidan') > -1 || lowered.indexOf('imagetools') > -1)) return;
    if (value && !seen[value]) {
        seen[value] = true;
        urls.push(value);
    }
}
add(document.querySelector('#spec-img'), false);
var carousel = document.querySelectorAll('.image-carousel-track .item img, [class*="image-carousel-track"] .item img');
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
        raw["native_gallery"] = native_gallery
        raw["video_candidates"] = _extract_video_candidates(tab)
    extractor._slow_scroll_to_load()
    details = extractor._extract_detail_images_by_js()
    return map_product(source_url, raw, details)
