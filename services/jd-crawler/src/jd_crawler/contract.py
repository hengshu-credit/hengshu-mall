"""Input validation and the mall-facing product contract."""

from __future__ import annotations

import math
import re
from urllib.parse import urlsplit


_DESKTOP_HOST = "item.jd.com"
_MOBILE_HOSTS = {"item.m.jd.com", "m.item.jd.com"}
_DESKTOP_PATH = re.compile(r"/([0-9]{1,20})\.html")
_MOBILE_PATH = re.compile(r"/product/([0-9]{1,20})\.html")
_MEDIA_SUFFIXES = (".360buyimg.com", ".jdimg.com")
_VIDEO_SUFFIXES = (".360buyimg.com",)


class ContractError(ValueError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def canonicalize_item_url(value: object) -> str:
    if not isinstance(value, str) or not value or len(value) > 2048 or re.search(r'[\x00-\x20\x7f]', value):
        raise ContractError("invalid_url", "A valid JD item URL is required.")
    try:
        parsed = urlsplit(value.strip())
    except ValueError as exc:
        raise ContractError("invalid_url", "A valid JD item URL is required.") from exc

    host = (parsed.hostname or "").lower()
    try:
        has_port = parsed.port is not None
    except ValueError as exc:
        raise ContractError("invalid_url", "Only JD item URLs are accepted.") from exc
    if (parsed.scheme.lower() not in {"http", "https"} or parsed.username is not None
            or parsed.password is not None or has_port):
        raise ContractError("invalid_url", "Only JD item URLs are accepted.")

    path_pattern = _DESKTOP_PATH if host == _DESKTOP_HOST else _MOBILE_PATH
    if host != _DESKTOP_HOST and host not in _MOBILE_HOSTS:
        raise ContractError("invalid_url", "Only JD item URLs are accepted.")
    matched = path_pattern.fullmatch(parsed.path)
    if not matched:
        raise ContractError("invalid_url", "Only JD item URLs are accepted.")
    return f"https://item.jd.com/{matched.group(1)}.html"


def _text(value: object, limit: int = 500) -> str:
    if value is None:
        return ""
    return " ".join(str(value).split())[:limit]


def _price(value: object) -> float | None:
    try:
        result = float(str(value).replace(",", "").strip())
    except (TypeError, ValueError):
        return None
    if not math.isfinite(result) or result < 0:
        return None
    return result


def normalize_media_url(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    raw = value.replace("`", "").strip()
    if raw.startswith("//"):
        raw = "https:" + raw
    elif raw.startswith("http://"):
        raw = "https://" + raw[7:]
    try:
        parsed = urlsplit(raw)
        has_port = parsed.port is not None
    except ValueError:
        return None
    host = (parsed.hostname or "").lower()
    if parsed.scheme != "https" or parsed.username is not None or has_port:
        return None
    if not any(host.endswith(suffix) for suffix in _MEDIA_SUFFIXES):
        return None
    if not parsed.path or parsed.path == "/":
        return None
    return parsed.geturl()


def _classify_video_url(value: object) -> tuple[str, str] | None:
    if not isinstance(value, str):
        return None
    raw = value.replace("`", "").strip()
    if raw.startswith("//"):
        raw = "https:" + raw
    elif raw.startswith("http://"):
        raw = "https://" + raw[7:]
    try:
        parsed = urlsplit(raw)
        has_port = parsed.port is not None
    except ValueError:
        return None
    host = (parsed.hostname or "").lower()
    jd_video_host = bool(re.fullmatch(r"(?:[a-z0-9-]+\.)*(?:jdvideo|jvideo|jvod|video|vod)\.jd\.com", host))
    trusted_host = jd_video_host or any(host.endswith(suffix) for suffix in _VIDEO_SUFFIXES)
    if (parsed.scheme != "https" or parsed.username is not None or has_port
            or not trusted_host or not parsed.path):
        return None
    path = parsed.path.lower()
    normalized = parsed.geturl()
    if len(normalized) > 500:
        return "too_long", normalized
    if path.endswith(".m3u8"):
        return "stream", normalized
    if path.endswith((".mp4", ".webm", ".mov", ".m4v", ".ogv")):
        return "direct", normalized
    return None


def _video(raw: dict[str, object]) -> tuple[str | None, list[str]]:
    candidates: list[object] = [raw.get("video_url")]
    supplied = raw.get("video_candidates")
    if isinstance(supplied, list):
        candidates.extend(supplied)
    gallery = raw.get("gallery")
    if isinstance(gallery, list):
        for item in gallery:
            entries = item if isinstance(item, list) else [item]
            for entry in entries:
                if isinstance(entry, dict) and entry.get("type") == "video":
                    candidates.append(entry.get("url"))
    warnings: list[str] = []
    for candidate in candidates:
        classified = _classify_video_url(candidate)
        if classified is None:
            continue
        kind, url = classified
        if kind == "direct":
            return url, []
        warning = "video_url_too_long" if kind == "too_long" else "video_stream_unavailable"
        if warning not in warnings:
            warnings.append(warning)
    return None, warnings


def _dedupe(values: list[str]) -> list[str]:
    return list(dict.fromkeys(values))


def _gallery_images(gallery: object) -> list[str]:
    output: list[str] = []
    if not isinstance(gallery, list):
        return output
    for item in gallery:
        candidates = item if isinstance(item, list) else [item]
        image_candidates = [
            candidate for candidate in candidates
            if isinstance(candidate, dict) and candidate.get("type", "image") == "image"
        ]
        image_candidates.sort(
            key=lambda candidate: {"1440": 0, "800": 1, "228": 2}.get(str(candidate.get("size")), 3)
        )
        for candidate in image_candidates:
            url = normalize_media_url(candidate.get("url"))
            if url:
                output.append(url)
                break
    return _dedupe(output)


def _native_gallery_images(gallery: object) -> list[str]:
    if not isinstance(gallery, list):
        return []
    return _dedupe([
        normalized for value in gallery
        if (normalized := normalize_media_url(value)) is not None
    ])


def _detail_images(details: object) -> list[str]:
    output: list[str] = []
    if not isinstance(details, list):
        return output
    for item in details:
        candidates = item if isinstance(item, list) else [item]
        for candidate in candidates:
            if isinstance(candidate, dict) and candidate.get("type", "image") == "image":
                url = normalize_media_url(candidate.get("url"))
                if url:
                    output.append(url)
                    break
    return _dedupe(output)


def _pairs(items: object) -> list[dict[str, str]]:
    output: list[dict[str, str]] = []
    if not isinstance(items, list):
        return output
    for item in items:
        if not isinstance(item, dict):
            continue
        name = _text(item.get("name"), 100)
        value = _text(item.get("value"), 500)
        if name and value:
            output.append({"name": name, "value": value})
    return output


def _attributes(raw: dict[str, object]) -> list[dict[str, str]]:
    attributes = _pairs(raw.get("attributes"))
    brand = _text(raw.get("brand"), 500)
    if brand and not any(attribute["name"] == "品牌" for attribute in attributes):
        attributes.append({"name": "品牌", "value": brand})
    return attributes


def _selected_specs(groups: object) -> list[dict[str, str]]:
    output: list[dict[str, str]] = []
    if not isinstance(groups, list):
        return output
    for group in groups:
        if not isinstance(group, dict):
            continue
        name = _text(group.get("label"), 100)
        options = group.get("options")
        if not name or not isinstance(options, list):
            continue
        for option in options:
            if not isinstance(option, dict) or option.get("selected") is not True:
                continue
            value = _text(option.get("name"), 200)
            if value:
                output.append({"name": name, "value": value})
                break
    return output


def map_product(source_url: str, raw: object, details: object) -> dict[str, object]:
    source_url = canonicalize_item_url(source_url)
    if not isinstance(raw, dict):
        raise ContractError("extraction_failed", "JD returned no product data.")
    title = _text(raw.get("title"), 500)
    if not title:
        raise ContractError("extraction_failed", "JD returned no product title.")

    price = _price(raw.get("price"))
    video_link, video_warnings = _video(raw)
    images = (_native_gallery_images(raw.get("native_gallery"))
              if "native_gallery" in raw else _gallery_images(raw.get("gallery")))
    detail_images = _detail_images(details)
    warnings: list[str] = []
    if price is None:
        warnings.append("price_unavailable")
    if not images:
        warnings.append("images_unavailable")
    if not detail_images:
        warnings.append("detail_images_unavailable")
    warnings.extend(video_warnings)

    sku_id = _DESKTOP_PATH.fullmatch(urlsplit(source_url).path).group(1)
    return {
        "sku_id": sku_id,
        "source_url": source_url,
        "title": title,
        "price": price,
        "video_link": video_link,
        "images": images,
        "detail_images": detail_images,
        "attributes": _attributes(raw),
        "selected_specs": _selected_specs(raw.get("sku_groups", raw.get("sku_options"))),
        "warnings": warnings,
    }
