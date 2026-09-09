"""Single-active-job subprocess scheduler with a hard deadline."""

from __future__ import annotations

import json
import subprocess
import sys
import threading
from pathlib import Path
from typing import Callable, Sequence

from .store import JobStore


CommandBuilder = Callable[[str, str, Path], Sequence[str]]
_WORKER_ERROR_CODES = {
    "login_required",
    "verification_required",
    "browser_unavailable",
    "extraction_failed",
}


class BusyError(RuntimeError):
    code = "busy"
    message = "A JD collection job is already running."


def default_command_builder(job_id: str, source_url: str, output_path: Path) -> Sequence[str]:
    return [
        sys.executable,
        "-m",
        "jd_crawler.worker",
        "--url",
        source_url,
        "--output",
        str(output_path),
    ]


class JobManager:
    def __init__(
        self,
        store: JobStore,
        work_dir: Path,
        timeout_seconds: float,
        command_builder: CommandBuilder = default_command_builder,
    ):
        self.store = store
        self.work_dir = Path(work_dir)
        self.work_dir.mkdir(parents=True, exist_ok=True)
        self.timeout_seconds = timeout_seconds
        self.command_builder = command_builder
        self._lock = threading.Lock()
        self._active_job_id: str | None = None
        self.store.recover_incomplete()
        self.store.purge_expired()

    def is_busy(self) -> bool:
        with self._lock:
            return self._active_job_id is not None

    def submit(self, source_url: str) -> dict[str, str]:
        with self._lock:
            if self._active_job_id is not None:
                raise BusyError()
            job_id = self.store.create(source_url)
            self._active_job_id = job_id
            thread = threading.Thread(
                target=self._execute,
                args=(job_id, source_url),
                name=f"jd-job-{job_id}",
                daemon=True,
            )
            thread.start()
        # The creation response is always an acknowledgement. A fast worker may
        # already have finished, but callers obtain its result through polling.
        return {"job_id": job_id, "state": "queued"}

    def _execute(self, job_id: str, source_url: str) -> None:
        output_path = self.work_dir / f"{job_id}.json"
        process: subprocess.Popen[bytes] | None = None
        try:
            self.store.mark_running(job_id)
            command = list(self.command_builder(job_id, source_url, output_path))
            process = subprocess.Popen(
                command,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                shell=False,
            )
            try:
                process.wait(timeout=self.timeout_seconds)
            except subprocess.TimeoutExpired:
                process.terminate()
                try:
                    process.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=3)
                self.store.mark_failed(
                    job_id,
                    "timeout",
                    "The JD page did not finish within the configured time limit.",
                )
                return

            result = self._read_result(output_path)
            if process.returncode == 0 and result.get("ok") is True and isinstance(result.get("product"), dict):
                self.store.mark_succeeded(job_id, result["product"])
                return
            error = result.get("error") if isinstance(result.get("error"), dict) else {}
            code = str(error.get("code", "extraction_failed"))
            if code not in _WORKER_ERROR_CODES:
                code = "extraction_failed"
            message = str(error.get("message") or "JD product extraction failed.")[:500]
            self.store.mark_failed(job_id, code, message)
        except (OSError, ValueError):
            self.store.mark_failed(
                job_id,
                "browser_unavailable",
                "The crawler browser is unavailable.",
            )
        except Exception:
            self.store.mark_failed(job_id, "extraction_failed", "JD product extraction failed.")
        finally:
            try:
                output_path.unlink(missing_ok=True)
            finally:
                with self._lock:
                    if self._active_job_id == job_id:
                        self._active_job_id = None

    @staticmethod
    def _read_result(output_path: Path) -> dict[str, object]:
        try:
            if output_path.stat().st_size > 10 * 1024 * 1024:
                return {}
            value = json.loads(output_path.read_text(encoding="utf-8"))
            return value if isinstance(value, dict) else {}
        except (OSError, ValueError):
            return {}
