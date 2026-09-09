import json
import pathlib
import sys
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request


ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from jd_crawler.api import create_server
from jd_crawler.jobs import JobManager
from jd_crawler.store import JobStore
from test_jobs import PRODUCT, command_that_writes


class HttpApiTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.store = JobStore(pathlib.Path(self.directory.name) / "jobs.sqlite3", retention_seconds=60)
        self.manager = JobManager(
            self.store,
            pathlib.Path(self.directory.name) / "results",
            timeout_seconds=2,
            command_builder=command_that_writes({"ok": True, "product": PRODUCT}, delay=0.15),
        )
        self.server = create_server("127.0.0.1", 0, "test-secret", self.store, self.manager)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base = f"http://127.0.0.1:{self.server.server_port}"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self.directory.cleanup()

    def request(self, method, path, body=None, token="test-secret"):
        data = json.dumps(body).encode() if body is not None else None
        headers = {"Content-Type": "application/json"}
        if token is not None:
            headers["Authorization"] = f"Bearer {token}"
        request = urllib.request.Request(self.base + path, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=2) as response:
                return response.status, json.loads(response.read())
        except urllib.error.HTTPError as error:
            return error.code, json.loads(error.read())

    def wait_for_job(self, job_id):
        deadline = time.monotonic() + 3
        while time.monotonic() < deadline:
            status, payload = self.request("GET", f"/v1/jobs/{job_id}")
            if payload.get("state") in {"succeeded", "failed"}:
                return status, payload
            time.sleep(0.02)
        self.fail("job did not finish")

    def test_every_endpoint_requires_bearer_auth(self):
        calls = [
            ("GET", "/health", None),
            ("POST", "/v1/jobs", {"url": "https://item.jd.com/1.html"}),
            ("GET", "/v1/jobs/00000000-0000-0000-0000-000000000000", None),
        ]
        for method, path, body in calls:
            with self.subTest(path=path):
                status, payload = self.request(method, path, body, token=None)
                self.assertEqual(status, 401)
                self.assertEqual(payload, {"error": {"code": "unauthorized", "message": "Bearer authentication is required."}})

    def test_health_reports_authenticated_state(self):
        status, payload = self.request("GET", "/health")
        self.assertEqual(status, 200)
        self.assertEqual(payload, {"state": "ready"})

    def test_post_and_poll_success_contract(self):
        status, created = self.request("POST", "/v1/jobs", {"url": "https://item.jd.com/1.html"})
        self.assertEqual(status, 202)
        self.assertEqual(set(created), {"job_id", "state"})
        self.assertIn(created["state"], {"queued", "running"})

        status, finished = self.wait_for_job(created["job_id"])
        self.assertEqual(status, 200)
        self.assertEqual(finished, {"job_id": created["job_id"], "state": "succeeded", "product": PRODUCT})

    def test_rejects_invalid_url_and_busy_job(self):
        status, payload = self.request("POST", "/v1/jobs", {"url": "https://evil.test/1.html"})
        self.assertEqual(status, 400)
        self.assertEqual(payload["error"]["code"], "invalid_url")

        status, first = self.request("POST", "/v1/jobs", {"url": "https://item.jd.com/1.html"})
        self.assertEqual(status, 202)
        status, payload = self.request("POST", "/v1/jobs", {"url": "https://item.jd.com/2.html"})
        self.assertEqual(status, 409)
        self.assertEqual(payload, {"error": {"code": "busy", "message": "A JD collection job is already running."}})
        self.wait_for_job(first["job_id"])

    def test_unknown_job_uses_not_found_error_contract(self):
        status, payload = self.request("GET", "/v1/jobs/00000000-0000-0000-0000-000000000000")
        self.assertEqual(status, 404)
        self.assertEqual(payload, {"error": {"code": "not_found", "message": "The crawler job was not found."}})


if __name__ == "__main__":
    unittest.main()
