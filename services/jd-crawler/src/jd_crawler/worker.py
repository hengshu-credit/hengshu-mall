"""One-job browser subprocess. It never invokes the upstream run() method."""

from __future__ import annotations

import argparse
import json
import os
import signal
import sys
import time
from pathlib import Path

from .contract import ContractError, canonicalize_item_url
from .extractor import ExtractionError, classify_page, extract_product, validate_final_item


class WorkerStopped(BaseException):
    pass


def crawl(source_url: str, browser_address: str, scroll_pause: float) -> dict[str, object]:
    try:
        from DrissionPage import Chromium, ChromiumOptions
        options = ChromiumOptions().set_address(browser_address).existing_only()
        browser = Chromium(options)
    except Exception as exc:
        raise ExtractionError("browser_unavailable", "The crawler browser is unavailable.") from exc

    tab = None
    try:
        tab = browser.new_tab()
        tab.get(source_url)
        deadline = time.monotonic() + 30
        while True:
            classify_page(tab)
            try:
                ready = tab.run_js(
                    "return Boolean(document.querySelector('.sku-name,.itemInfo-wrap h1,#name h1,h1'));"
                )
            except Exception:
                ready = False
            if ready:
                break
            if time.monotonic() >= deadline:
                raise ExtractionError("extraction_failed", "The JD item page did not load product data.")
            time.sleep(1)
        validate_final_item(tab, source_url)
        product = extract_product(tab, source_url, scroll_pause)
        validate_final_item(tab, source_url)
        return product
    finally:
        if tab is not None:
            try:
                tab.close()
            except Exception:
                pass


def write_result(path: Path, result: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    os.replace(temporary, path)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args(argv)

    def stop_worker(signum: int, frame: object) -> None:
        raise WorkerStopped()

    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, stop_worker)

    try:
        source_url = canonicalize_item_url(args.url)
        browser_address = os.environ.get("JD_BROWSER_ADDRESS", "127.0.0.1:9222")
        scroll_pause = float(os.environ.get("JD_SCROLL_PAUSE", "0.8"))
        if not 0.05 <= scroll_pause <= 5:
            raise ValueError
        product = crawl(source_url, browser_address, scroll_pause)
        write_result(args.output, {"ok": True, "product": product})
        return 0
    except WorkerStopped:
        return 143
    except (ContractError, ExtractionError) as error:
        write_result(args.output, {"ok": False, "error": {"code": error.code, "message": error.message}})
        return 1
    except Exception:
        write_result(args.output, {"ok": False, "error": {
            "code": "extraction_failed", "message": "JD product extraction failed."
        }})
        return 1


if __name__ == "__main__":
    sys.exit(main())
