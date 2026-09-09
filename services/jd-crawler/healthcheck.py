"""Read-only authenticated container liveness probe; never prints credentials."""
import os
import json
import urllib.request
from pathlib import Path
from jd_crawler.bootstrap import read_credentials

credentials = read_credentials(Path(os.environ.get('JD_CRAWLER_DATA_DIR', '/data')), os.environ)

request = urllib.request.Request(
    "http://127.0.0.1:8091/health",
    headers={"Authorization": "Bearer " + credentials['JD_CRAWLER_TOKEN']},
)
with urllib.request.urlopen(request, timeout=3) as response:
    if response.status != 200:
        raise SystemExit(1)
with urllib.request.urlopen('http://127.0.0.1:9222/json/version', timeout=2) as response:
    if not json.load(response).get('webSocketDebuggerUrl'):
        raise SystemExit(1)
