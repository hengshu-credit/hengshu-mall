import pathlib
import sys
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from jd_crawler.extractor import (
    ExtractionError,
    _extract_native_gallery,
    _extract_video_candidates,
    original_image_candidate,
    _prefer_full_size_gallery,
    classify_page,
    extract_product,
    validate_final_item,
)


class FakeExtractors:
    calls = []

    def __init__(self):
        self.page = None
        self.scroll_pause = None

    def _extract_all_by_js(self):
        self.calls.append(("all", self.page, self.scroll_pause))
        return {"title": "商品", "price": "10", "gallery": [], "attributes": [], "sku_options": []}

    def _slow_scroll_to_load(self):
        self.calls.append(("scroll", self.page, self.scroll_pause))

    def _extract_detail_images_by_js(self):
        self.calls.append(("details", self.page, self.scroll_pause))
        return []


class FakeTab:
    def __init__(self, url, title="", verification=False):
        self.url = url
        self.title = title
        self.verification = verification

    def run_js(self, script):
        if "querySelector" in script and "captcha" in script:
            return self.verification
        return "[]"


class ExtractorTests(unittest.TestCase):
    def test_native_gallery_probe_reads_dom_urls_without_size_rewriting(self):
        class RecordingTab:
            script = ""

            def run_js(self, script):
                self.script = script
                return '["https://img10.360buyimg.com/n1/s228x228_jfs/native.jpg.avif?sku=1"]'

        tab = RecordingTab()
        self.assertEqual(
            _extract_native_gallery(tab),
            ["https://img10.360buyimg.com/n1/s228x228_jfs/native.jpg.avif?sku=1"],
        )
        self.assertIn("#spec-img", tab.script)
        self.assertIn("image-carousel-track", tab.script)
        self.assertIn("data-origin", tab.script)
        self.assertIn("currentSrc", tab.script)
        self.assertIn("shaidan", tab.script)
        self.assertIn("imagetools", tab.script)
        self.assertIn("value.toLowerCase()", tab.script)
        self.assertIn("indexOf('play')", tab.script)
        self.assertIn("indexOf('icon')", tab.script)
        self.assertNotIn("s1440x1440", tab.script)

    def test_original_candidate_keeps_native_format_and_query(self):
        source = 'https://img10.360buyimg.com/n1/s228x228_jfs/t1/a.jpg.avif?sign=a%2Bb'
        self.assertEqual(original_image_candidate(source), 'https://img10.360buyimg.com/imgzone/jfs/t1/a.jpg.avif?sign=a%2Bb')
        self.assertIsNone(original_image_candidate('https://evil.test/n1/jfs/a.jpg'))
        self.assertIsNone(original_image_candidate('https://img10.360buyimg.com/sku/jfs/detail.webp'))

    def test_quality_probe_failure_retains_source(self):
        class OfflineTab:
            def run_js(self, *args):
                raise RuntimeError('offline')
        urls = ['https://img10.360buyimg.com/n1/s228x228_jfs/t1/a.jpg.avif']
        self.assertEqual(_prefer_full_size_gallery(OfflineTab(), urls), urls)

    def test_video_probe_reads_current_source_and_source_elements(self):
        class RecordingTab:
            script = ""

            def run_js(self, script):
                self.script = script
                return '["https://jdvideo.jd.com/native/demo.mp4"]'

        tab = RecordingTab()
        self.assertEqual(
            _extract_video_candidates(tab),
            ["https://jdvideo.jd.com/native/demo.mp4"],
        )
        self.assertIn("currentSrc", tab.script)
        self.assertIn("video source", tab.script)

    def test_calls_only_vendored_dom_helpers_in_order(self):
        FakeExtractors.calls = []
        tab = object()
        product = extract_product(
            tab,
            "https://item.jd.com/1.html",
            scroll_pause=0.25,
            extractor_class=FakeExtractors,
        )
        self.assertEqual([call[0] for call in FakeExtractors.calls], ["all", "scroll", "details"])
        self.assertTrue(all(call[1] is tab for call in FakeExtractors.calls))
        self.assertTrue(all(call[2] == 0.25 for call in FakeExtractors.calls))
        self.assertEqual(product["sku_id"], "1")

    def test_rejects_navigation_to_a_different_sku(self):
        validate_final_item(FakeTab("https://item.jd.com/1.html?utm_source=x"), "https://item.jd.com/1.html")
        with self.assertRaises(ExtractionError) as mismatch:
            validate_final_item(FakeTab("https://item.jd.com/2.html"), "https://item.jd.com/1.html")
        self.assertEqual(mismatch.exception.code, "extraction_failed")

    def test_classifies_login_and_verification_pages_without_interacting(self):
        with self.assertRaises(ExtractionError) as login:
            classify_page(FakeTab("https://passport.jd.com/new/login.aspx"))
        self.assertEqual(login.exception.code, "login_required")

        with self.assertRaises(ExtractionError) as verification:
            classify_page(FakeTab("https://item.jd.com/1.html", verification=True))
        self.assertEqual(verification.exception.code, "verification_required")

        with self.assertRaises(ExtractionError) as redirected:
            classify_page(FakeTab("https://www.jd.com/?reason=403"))
        self.assertEqual(redirected.exception.code, "verification_required")


if __name__ == "__main__":
    unittest.main()
