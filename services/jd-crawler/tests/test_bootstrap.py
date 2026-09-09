import json
import os
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))


class BootstrapTests(unittest.TestCase):
    def bootstrap(self):
        from jd_crawler import bootstrap
        return bootstrap

    def test_first_start_generates_private_credentials_and_restart_keeps_them(self):
        bootstrap = self.bootstrap()
        with tempfile.TemporaryDirectory() as directory:
            data = Path(directory)
            first = bootstrap.initialize_credentials(data, {})
            self.assertEqual(len(first['JD_CRAWLER_TOKEN']), 64)
            self.assertEqual(len(first['JD_VNC_PASSWORD']), 8)
            second = bootstrap.initialize_credentials(data, {})
            self.assertEqual(first, second)
            self.assertEqual(bootstrap.read_credentials(data, {}), first)
            if os.name != 'nt':
                self.assertEqual((data / 'credentials.json').stat().st_mode & 0o777, 0o600)

    def test_existing_environment_credentials_are_retained_after_env_is_removed(self):
        bootstrap = self.bootstrap()
        provided = {'JD_CRAWLER_TOKEN': 't' * 32, 'JD_VNC_PASSWORD': 'vncpass1'}
        with tempfile.TemporaryDirectory() as directory:
            data = Path(directory)
            self.assertEqual(bootstrap.initialize_credentials(data, provided), provided)
            self.assertEqual(bootstrap.initialize_credentials(data, {}), provided)

    def test_invalid_override_does_not_replace_saved_credentials(self):
        bootstrap = self.bootstrap()
        with tempfile.TemporaryDirectory() as directory:
            data = Path(directory)
            first = bootstrap.initialize_credentials(data, {})
            for bad in ({'JD_CRAWLER_TOKEN': 'short'}, {'JD_CRAWLER_TOKEN': 't' * 32 + '\n'},
                        {'JD_VNC_PASSWORD': 'too-long-password'}, {'JD_VNC_PASSWORD': '\n' * 8}):
                with self.assertRaises(ValueError):
                    bootstrap.initialize_credentials(data, bad)
                self.assertEqual(bootstrap.read_credentials(data, {}), first)

    def test_damaged_credentials_are_not_silently_regenerated(self):
        bootstrap = self.bootstrap()
        with tempfile.TemporaryDirectory() as directory:
            data = Path(directory)
            saved = data / 'credentials.json'
            for body in ('{incomplete', json.dumps({'JD_CRAWLER_TOKEN': 'short'})):
                saved.write_text(body, encoding='utf-8')
                with self.assertRaises(ValueError):
                    bootstrap.initialize_credentials(data, {})
                self.assertEqual(saved.read_text(encoding='utf-8'), body)

    def test_read_only_command_does_not_initialize_secrets(self):
        bootstrap = self.bootstrap()
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(FileNotFoundError):
                bootstrap.read_credentials(Path(directory), {})
            self.assertEqual(list(Path(directory).iterdir()), [])

    @unittest.skipUnless(os.name == 'posix', 'Browser ownership uses the Linux container filesystem lock')
    def test_browser_profile_is_exclusive_and_stale_container_locks_do_not_erase_login_data(self):
        bootstrap = self.bootstrap()
        with tempfile.TemporaryDirectory() as directory:
            data = Path(directory)
            profile = data / 'chromium'
            profile.mkdir()
            login = profile / 'login-data.fixture'
            login.write_bytes(b'existing encrypted browser data')
            for name in ('SingletonLock', 'SingletonCookie', 'SingletonSocket'):
                (profile / name).symlink_to('old-container-state')
            fd = bootstrap.acquire_browser_profile(data)
            try:
                self.assertTrue(os.get_inheritable(fd))
                for name in ('SingletonLock', 'SingletonCookie', 'SingletonSocket'):
                    self.assertFalse((profile / name).is_symlink())
                with self.assertRaisesRegex(ValueError, 'already in use'):
                    bootstrap.acquire_browser_profile(data)
                self.assertEqual(login.read_bytes(), b'existing encrypted browser data')
            finally:
                os.close(fd)
            reopened = bootstrap.acquire_browser_profile(data)
            os.close(reopened)


if __name__ == '__main__':
    unittest.main()
