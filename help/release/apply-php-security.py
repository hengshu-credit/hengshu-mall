#!/usr/bin/env python3
"""Apply the isolated PHP runtime package to an existing mall, without migrations of our own."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import time
from datetime import datetime, timezone
import urllib.request

IMAGE = 'hengshu-php:7.4.33-security-20261024'
OLD_IMAGE = 'ccr.ccs.tencentyun.com/crmebky_php/php:v7.4'
PHP_SERVICES = ['phpfpm', 'queue', 'timer', 'commerce', 'workerman']
WORKERS = PHP_SERVICES[1:]
PROTECTED_SERVICES = ['mysql', 'redis', 'jd-crawler', 'media-display']
VERIFY = ['php', '-d', 'open_basedir=/usr/local', '/usr/local/lib/php-security/verify.php']


def run(args, cwd=None):
    result = subprocess.run(args, cwd=cwd, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode:
        # Compose output can contain environment values; do not echo it in reports.
        raise RuntimeError('Command failed (exit %s): %s' % (result.returncode, ' '.join(args[:5])))
    return result.stdout


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest() if hasattr(hashlib, 'file_digest') else _stream_digest(stream)


def _stream_digest(stream):
    value = hashlib.sha256()
    for block in iter(lambda: stream.read(1024 * 1024), b''):
        value.update(block)
    return value.hexdigest()


def patched_compose(source):
    pattern = r'(?m)^  image: (?:' + re.escape(OLD_IMAGE) + '|' + re.escape(IMAGE) + r')[ \t]*$'
    result, count = re.subn(pattern, '  image: ' + IMAGE, source)
    if count != 1 or not re.search(r'(?m)^x-php: &php$', source):
        raise RuntimeError('Unrecognized PHP Compose anchor; manual review required')
    return result


def expected_image(actual, receipt):
    # Containerd-backed Docker may expose the OCI index digest as Id, while
    # classic Docker exposes the image config digest from the same saved image.
    return actual in {receipt['imageId'], receipt['imageConfigDigest']}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('mall', type=Path)
    parser.add_argument('--check', action='store_true', help='Read-only preflight; no image load or service restart')
    args = parser.parse_args()
    if not args.mall.is_absolute():
        raise RuntimeError('Use the absolute existing mall directory')
    mall = args.mall.resolve(strict=True)
    package = Path(__file__).resolve().parent
    for relative in ['compose.yml', '.env', 'crmeb/.env', 'crmeb/.constant', 'crmeb/public/install.lock']:
        if not (mall / relative).is_file():
            raise RuntimeError('Missing existing installation file: ' + relative)
    try:
        run(['docker', 'compose', 'version'])
        command = ['docker', 'compose', '-f', 'compose.yml']
    except RuntimeError:
        run(['docker-compose', 'version'])
        command = ['docker-compose', '-f', 'compose.yml']

    def compose(*parts):
        return run(command + list(parts), cwd=mall)

    def containers(names):
        result = {}
        for name in names:
            container_id = compose('ps', '-q', name).strip()
            if not container_id:
                raise RuntimeError('Service is not running: ' + name)
            result[name] = json.loads(run(['docker', 'inspect', container_id]))[0]
        return result

    source = (mall / 'compose.yml').read_text(encoding='utf-8')
    updated = patched_compose(source)
    config = json.loads(compose('config', '--format', 'json'))
    for name in PHP_SERVICES:
        if config['services'][name]['image'] not in [OLD_IMAGE, IMAGE]:
            raise RuntimeError('Unexpected image for ' + name)
    protected = containers(PROTECTED_SERVICES)
    php_before = containers(PHP_SERVICES)
    images = {item['Image'] for item in php_before.values()}
    if len(images) != 1:
        raise RuntimeError('PHP services currently use different image IDs')
    protected_files = ['.env', 'crmeb/.env', 'crmeb/.constant', 'crmeb/public/install.lock']
    before_hashes = {name: digest(mall / name) for name in protected_files}
    print(json.dumps({'preflight': 'passed', 'php_image_id': next(iter(images)),
                      'php_version': compose('exec', '-T', 'phpfpm', 'php', '-r', 'echo PHP_VERSION;').strip(),
                      'protected_services': list(protected)}, ensure_ascii=False), flush=True)
    if args.check:
        return
    receipt = json.loads((package / 'runtime.json').read_text(encoding='utf-8'))
    for name, expected in receipt['files'].items():
        file = (package / name).resolve(strict=True)
        if package not in file.parents or digest(file) != expected:
            raise RuntimeError('Package checksum failed: ' + name)
    run(['docker', 'load', '-i', str(package / 'php-image.tar')])
    actual_image = json.loads(run(['docker', 'image', 'inspect', IMAGE]))[0]['Id']
    if not expected_image(actual_image, receipt):
        raise RuntimeError('Loaded image identity mismatch')
    print(run(['docker', 'run', '--rm', '--network', 'none', '--entrypoint', 'php', IMAGE] + VERIFY[1:]).strip(), flush=True)
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backup = mall.parent / 'releases' / ('php-security-' + stamp)
    backup.mkdir(parents=True, mode=0o700)
    os.chmod(backup, 0o700)
    shutil.copy2(mall / 'compose.yml', backup / 'compose.yml')
    runtime = mall / 'php-runtime'
    if runtime.exists():
        shutil.copytree(runtime, backup / 'php-runtime')
    rollback_image = 'hengshu-php:rollback-' + stamp.lower()
    run(['docker', 'tag', next(iter(images)), rollback_image])
    print('Rollback backup: ' + str(backup), flush=True)
    changed = False
    try:
        shutil.copytree(package / 'php-runtime', runtime, dirs_exist_ok=True)
        staged = mall / 'compose.php-security.tmp'
        staged.write_text(updated, encoding='utf-8')
        shutil.copymode(mall / 'compose.yml', staged)
        run(command[:-1] + [staged.name, 'config', '--quiet'], cwd=mall)
        staged.replace(mall / 'compose.yml')
        changed = True
        compose('stop', *WORKERS)
        compose('up', '-d', '--no-deps', '--no-build', '--force-recreate', 'phpfpm')
        for _ in range(90):
            state = containers(['phpfpm'])['phpfpm']['State']
            if state.get('Health', {}).get('Status') == 'healthy':
                break
            time.sleep(2)
        else:
            raise RuntimeError('PHP-FPM did not become healthy')
        compose('up', '-d', '--no-deps', '--no-build', '--force-recreate', *WORKERS, 'nginx')
        compose('exec', '-T', 'nginx', 'nginx', '-t')
        for name in PHP_SERVICES:
            compose('exec', '-T', name, *VERIFY)
        after = containers(PHP_SERVICES + PROTECTED_SERVICES)
        for name in PHP_SERVICES:
            if after[name]['Image'] != actual_image or not after[name]['State']['Running']:
                raise RuntimeError('Security image not running for ' + name)
        for name in PROTECTED_SERVICES:
            if after[name]['Id'] != protected[name]['Id']:
                raise RuntimeError('Protected service was unexpectedly recreated: ' + name)
        if before_hashes != {name: digest(mall / name) for name in protected_files}:
            raise RuntimeError('Existing installation configuration changed')
        port = next(item['published'] for item in config['services']['nginx']['ports'] if int(item['target']) == 80)
        for route in ['/admin/', '/api/products?page=1&limit=1']:
            request = urllib.request.Request('http://127.0.0.1:%s%s' % (port, route), headers={
                'Host': 'mall.hengshucredit.com', 'X-Forwarded-Proto': 'https'})
            with urllib.request.urlopen(request, timeout=30) as response:
                body = response.read()
                if response.status != 200 or (route.startswith('/api/') and json.loads(body).get('status') != 200):
                    raise RuntimeError('Mall smoke check failed')
        result = {'completedAt': datetime.now(timezone.utc).isoformat(), 'imageId': actual_image,
                  'phpServices': PHP_SERVICES, 'configurationPreserved': True,
                  'dataServicesPreserved': True, 'httpSmoke': 'passed', 'backup': str(backup)}
        (backup / 'result.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
        print(json.dumps(result), flush=True)
    except Exception:
        if changed:
            # Restore availability to the captured image, not a possibly moved tag.
            rollback = re.sub(r'(?m)^  image: .*$', '  image: ' + rollback_image, source, count=1)
            (mall / 'compose.yml').write_text(rollback, encoding='utf-8')
            compose('up', '-d', '--no-deps', '--no-build', '--force-recreate', *PHP_SERVICES, 'nginx')
            print('Deployment failed; previous runtime restored. The security fix is NOT active.', flush=True)
        raise


if __name__ == '__main__':
    main()
