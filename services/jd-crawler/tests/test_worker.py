import pathlib
import sys
import types
import unittest
from unittest.mock import patch


ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from jd_crawler.worker import crawl


class WorkerBrowserTests(unittest.TestCase):
    def test_attaches_existing_browser_and_closes_only_job_tab(self):
        observed = {}

        class Options:
            def set_address(self, address):
                observed["address"] = address
                return self

            def existing_only(self, enabled=True):
                observed["existing_only"] = enabled
                return self

        class Tab:
            url = "https://item.jd.com/1.html"
            title = "商品"
            closed = False

            def get(self, url):
                observed["navigated"] = url

            def run_js(self, script):
                return False if "captcha" in script else True

            def close(self):
                self.closed = True

        tab = Tab()

        class Browser:
            def __init__(self, options):
                observed["options"] = options

            def new_tab(self):
                return tab

        fake_module = types.SimpleNamespace(Chromium=Browser, ChromiumOptions=Options)
        expected = {"sku_id": "1"}
        with patch.dict(sys.modules, {"DrissionPage": fake_module}), \
                patch("jd_crawler.worker.extract_product", return_value=expected):
            actual = crawl("https://item.jd.com/1.html", "127.0.0.1:9222", 0.8)

        self.assertEqual(actual, expected)
        self.assertEqual(observed["address"], "127.0.0.1:9222")
        self.assertTrue(observed["existing_only"])
        self.assertTrue(tab.closed)


if __name__ == "__main__":
    unittest.main()
