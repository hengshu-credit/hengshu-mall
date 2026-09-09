"""Initialize private credentials once, then launch the dedicated browser stack."""
from __future__ import annotations

import json
import os
from pathlib import Path
import secrets
import sys
import tempfile
from typing import Mapping

KEYS = ('JD_CRAWLER_TOKEN', 'JD_VNC_PASSWORD')


def _validate(values: dict) -> dict[str, str]:
    for key, minimum, maximum in ((KEYS[0], 32, 256), (KEYS[1], 8, 8)):
        value = values.get(key, '')
        if not isinstance(value, str) or not minimum <= len(value) <= maximum or any(
            ord(char) < 33 or ord(char) > 126 for char in value
        ):
            raise ValueError(f'{key} must contain {minimum} to {maximum} printable ASCII characters without spaces')
    return {key: values[key] for key in KEYS}


def _saved(data: Path) -> dict[str, str]:
    try:
        values = json.loads((data / 'credentials.json').read_text(encoding='utf-8'))
    except (json.JSONDecodeError, UnicodeError) as error:
        raise ValueError('Saved crawler credentials are damaged; restore credentials.json from backup') from error
    if not isinstance(values, dict):
        raise ValueError('Saved crawler credentials must be a JSON object')
    return _validate(values)


def read_credentials(data: Path, environment: Mapping[str, str]) -> dict[str, str]:
    """Read-only: health checks and operator commands never create new secrets."""
    overrides = {key: environment[key] for key in KEYS if environment.get(key)}
    if len(overrides) == len(KEYS):
        return _validate(overrides)
    return _validate({**_saved(data), **overrides})


def initialize_credentials(data: Path, environment: Mapping[str, str]) -> dict[str, str]:
    data.mkdir(parents=True, exist_ok=True)
    target = data / 'credentials.json'
    saved = _saved(data) if target.exists() else {}
    values = {**saved, **{key: environment[key] for key in KEYS if environment.get(key)}}
    values.setdefault(KEYS[0], secrets.token_hex(32))
    values.setdefault(KEYS[1], secrets.token_hex(4))
    values = _validate(values)
    if values != saved:
        fd, filename = tempfile.mkstemp(prefix='.credentials-', dir=data)
        temporary = Path(filename)
        try:
            with os.fdopen(fd, 'w', encoding='utf-8') as stream:
                json.dump(values, stream)
                stream.write('\n')
                stream.flush()
                os.fsync(stream.fileno())
            os.chmod(temporary, 0o600)
            os.replace(temporary, target)
        finally:
            temporary.unlink(missing_ok=True)
    os.chmod(target, 0o600)
    return values


def acquire_browser_profile(data: Path) -> int:
    """Hold a volume-wide Linux lock across exec before removing stale Chromium IPC links."""
    import fcntl
    data.mkdir(parents=True, exist_ok=True)
    fd = os.open(data / '.browser-profile.lock', os.O_RDWR | os.O_CREAT, 0o600)
    try:
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            raise ValueError('The crawler browser data volume is already in use by another service') from error
        profile = data / 'chromium'
        profile.mkdir(exist_ok=True)
        # These are process/socket links, not cookies, storage or user preferences.
        for name in ('SingletonLock', 'SingletonCookie', 'SingletonSocket'):
            (profile / name).unlink(missing_ok=True)
        os.set_inheritable(fd, True)
        return fd
    except BaseException:
        os.close(fd)
        raise


def main() -> int:
    data = Path(os.environ.get('JD_CRAWLER_DATA_DIR', '/data'))
    profile_fd = None
    try:
        if sys.argv[1:] == ['show']:
            values = read_credentials(data, os.environ)
            login_port = int(os.environ.get('JD_LOGIN_PORT', '6080'))
            if not 1 <= login_port <= 65535:
                raise ValueError('JD_LOGIN_PORT must be between 1 and 65535')
            print('商城后台服务地址: http://jd-crawler:8091')
            for key in KEYS:
                print(f'{key}={values[key]}')
            print(f'本地 SSH 转发: ssh -N -L 6080:127.0.0.1:{login_port} root@服务器IP')
            print('本地登录页面: http://127.0.0.1:6080/vnc.html')
            return 0
        if sys.argv[1:]:
            raise ValueError('Usage: python -m jd_crawler.bootstrap [show]')
        profile_fd = acquire_browser_profile(data)
        values = initialize_credentials(data, os.environ)
    except (OSError, ValueError) as error:
        if profile_fd is not None:
            os.close(profile_fd)
        print(f'Crawler startup configuration error: {error}', file=sys.stderr)
        return 2
    print('Crawler credentials ready; use the show command to view login details.', flush=True)
    os.execve('/app/entrypoint.sh', ['/app/entrypoint.sh'], {**os.environ, **values})
    return 0


if __name__ == '__main__':
    sys.exit(main())
