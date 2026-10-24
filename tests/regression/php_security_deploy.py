"""Check that the runtime hotfix cannot rewrite unrelated Compose settings."""
import ast
import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'help/release/apply-php-security.py'
spec = importlib.util.spec_from_file_location('php_security_deploy', SOURCE)
deploy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy)


class RuntimeDeployment(unittest.TestCase):
    def test_only_image_changes(self):
        current = (ROOT / 'help/release/compose.yml').read_text(encoding='utf-8')
        previous = current.replace(deploy.IMAGE, deploy.OLD_IMAGE)
        self.assertEqual(deploy.patched_compose(previous), current)
        self.assertEqual(deploy.patched_compose(current), current)

    def test_unrecognized_layout_rejected(self):
        for source in ['services: {}', 'x-php: &php\n  image: unknown:latest\n',
                       'x-php: &php\n  image: ' + deploy.OLD_IMAGE + '\n  image: ' + deploy.OLD_IMAGE]:
            with self.assertRaises(RuntimeError):
                deploy.patched_compose(source)

    def test_source_parses(self):
        ast.parse(SOURCE.read_text(encoding='utf-8'))

    def test_docker_image_identity_formats(self):
        receipt = {'imageId': 'sha256:' + '1' * 64, 'imageConfigDigest': 'sha256:' + '2' * 64}
        self.assertTrue(deploy.expected_image(receipt['imageId'], receipt))
        self.assertTrue(deploy.expected_image(receipt['imageConfigDigest'], receipt))
        self.assertFalse(deploy.expected_image('sha256:' + '3' * 64, receipt))


if __name__ == '__main__':
    unittest.main()
