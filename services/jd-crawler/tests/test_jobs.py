import json
import pathlib
import sys
import tempfile
import time
import unittest
from unittest.mock import patch


ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from jd_crawler.jobs import BusyError, JobManager
from jd_crawler.store import JobStore


PRODUCT = {
    "sku_id": "1",
    "source_url": "https://item.jd.com/1.html",
    "title": "商品",
    "price": None,
    "video_link": None,
    "images": [],
    "detail_images": [],
    "attributes": [],
    "selected_specs": [],
    "warnings": ["price_unavailable"],
}


def command_that_writes(payload, delay=0):
    script = (
        "import json,pathlib,sys,time;"
        f"time.sleep({delay!r});"
        f"pathlib.Path(sys.argv[1]).write_text(json.dumps({payload!r}),encoding='utf-8')"
    )
    return lambda job_id, url, output: [sys.executable, "-c", script, str(output)]


def wait_for_terminal(store, job_id, timeout=3):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        job = store.get(job_id)
        if job and job["state"] in {"succeeded", "failed"}:
            return job
        time.sleep(0.01)
    raise AssertionError("job did not finish")


class JobStoreTests(unittest.TestCase):
    def test_recovers_incomplete_jobs_as_failed(self):
        with tempfile.TemporaryDirectory() as directory:
            store = JobStore(pathlib.Path(directory) / "jobs.sqlite3", retention_seconds=60)
            job_id = store.create("https://item.jd.com/1.html")
            store.mark_running(job_id)

            self.assertEqual(store.recover_incomplete(), 1)
            recovered = store.get(job_id)
            self.assertEqual(recovered["state"], "failed")
            self.assertEqual(recovered["error"], {
                "code": "service_restarted",
                "message": "The crawler service restarted before this job completed.",
            })

    def test_purges_jobs_after_retention(self):
        with tempfile.TemporaryDirectory() as directory:
            store = JobStore(pathlib.Path(directory) / "jobs.sqlite3", retention_seconds=0.02)
            job_id = store.create("https://item.jd.com/1.html")
            store.mark_failed(job_id, "extraction_failed", "failed")
            time.sleep(0.04)
            self.assertEqual(store.purge_expired(), 1)
            self.assertIsNone(store.get(job_id))


class JobManagerTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.store = JobStore(pathlib.Path(self.directory.name) / "jobs.sqlite3", retention_seconds=60)

    def tearDown(self):
        self.directory.cleanup()

    def test_runs_subprocess_and_persists_success(self):
        manager = JobManager(
            self.store,
            pathlib.Path(self.directory.name) / "results",
            timeout_seconds=2,
            command_builder=command_that_writes({"ok": True, "product": PRODUCT}),
        )
        created = manager.submit("https://item.jd.com/1.html")
        self.assertIn(created["state"], {"queued", "running"})

        job = wait_for_terminal(self.store, created["job_id"])
        self.assertEqual(job["state"], "succeeded")
        self.assertEqual(job["product"], PRODUCT)
        self.assertNotIn("error", job)

    def test_submission_always_returns_a_polling_handle_even_for_fast_worker(self):
        manager = JobManager(self.store, pathlib.Path(self.directory.name) / 'results', 2,
                             command_builder=command_that_writes({'ok': True, 'product': PRODUCT}))
        with patch.object(self.store, 'get', return_value={'state': 'succeeded'}):
            created = manager.submit('https://item.jd.com/1.html')
        wait_for_terminal(self.store, created['job_id'])
        self.assertIn(created['state'], {'queued', 'running'})

    def test_rejects_second_job_while_one_is_active(self):
        manager = JobManager(
            self.store,
            pathlib.Path(self.directory.name) / "results",
            timeout_seconds=2,
            command_builder=command_that_writes({"ok": True, "product": PRODUCT}, delay=0.3),
        )
        first = manager.submit("https://item.jd.com/1.html")
        with self.assertRaises(BusyError) as raised:
            manager.submit("https://item.jd.com/2.html")
        self.assertEqual(raised.exception.code, "busy")
        wait_for_terminal(self.store, first["job_id"])

    def test_enforces_hard_subprocess_timeout(self):
        manager = JobManager(
            self.store,
            pathlib.Path(self.directory.name) / "results",
            timeout_seconds=0.05,
            command_builder=command_that_writes({"ok": True, "product": PRODUCT}, delay=5),
        )
        created = manager.submit("https://item.jd.com/1.html")
        job = wait_for_terminal(self.store, created["job_id"])
        self.assertEqual(job["state"], "failed")
        self.assertEqual(job["error"], {
            "code": "timeout",
            "message": "The JD page did not finish within the configured time limit.",
        })

    def test_persists_worker_error_without_internal_details(self):
        manager = JobManager(
            self.store,
            pathlib.Path(self.directory.name) / "results",
            timeout_seconds=2,
            command_builder=command_that_writes({
                "ok": False,
                "error": {"code": "verification_required", "message": "Complete JD verification, then retry."},
            }),
        )
        created = manager.submit("https://item.jd.com/1.html")
        job = wait_for_terminal(self.store, created["job_id"])
        self.assertEqual(job["state"], "failed")
        self.assertEqual(job["error"]["code"], "verification_required")


if __name__ == "__main__":
    unittest.main()
