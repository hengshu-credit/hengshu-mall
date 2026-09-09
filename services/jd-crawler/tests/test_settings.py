import pathlib
import sys
import unittest
from unittest.mock import patch


ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from jd_crawler.settings import Settings


class SettingsTests(unittest.TestCase):
    def test_requires_token_and_caps_job_timeout(self):
        with patch.dict("os.environ", {}, clear=True):
            with self.assertRaisesRegex(ValueError, "JD_CRAWLER_TOKEN"):
                Settings.from_environment()
        with patch.dict("os.environ", {"JD_CRAWLER_TOKEN": "s" * 32, "JD_CRAWLER_JOB_TIMEOUT": "301"}, clear=True):
            with self.assertRaisesRegex(ValueError, "JD_CRAWLER_JOB_TIMEOUT"):
                Settings.from_environment()

    def test_defaults_match_container_contract(self):
        with patch.dict("os.environ", {"JD_CRAWLER_TOKEN": "s" * 32}, clear=True):
            settings = Settings.from_environment()
        self.assertEqual(settings.host, "0.0.0.0")
        self.assertEqual(settings.port, 8091)
        self.assertEqual(settings.timeout_seconds, 240)
        self.assertEqual(settings.data_dir, pathlib.Path("/data"))

    def test_rejects_short_or_whitespace_tokens(self):
        for token in ['short', 'x' * 32 + '\n']:
            with patch.dict('os.environ', {'JD_CRAWLER_TOKEN': token}, clear=True):
                with self.assertRaisesRegex(ValueError, 'JD_CRAWLER_TOKEN'):
                    Settings.from_environment()


if __name__ == "__main__":
    unittest.main()
