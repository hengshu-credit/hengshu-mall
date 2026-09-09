"""SQLite persistence for asynchronous crawler jobs."""

from __future__ import annotations

import json
import sqlite3
import time
import uuid
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator


class JobStore:
    def __init__(self, path: Path, retention_seconds: float):
        self.path = Path(path)
        self.retention_seconds = retention_seconds
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    @contextmanager
    def _connect(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self.path, timeout=10)
        connection.row_factory = sqlite3.Row
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.execute("PRAGMA journal_mode=WAL")
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS jobs (
                    job_id TEXT PRIMARY KEY,
                    source_url TEXT NOT NULL,
                    state TEXT NOT NULL CHECK (state IN ('queued','running','succeeded','failed')),
                    product_json TEXT,
                    error_code TEXT,
                    error_message TEXT,
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL,
                    expires_at REAL NOT NULL
                )
                """
            )
            connection.execute("CREATE INDEX IF NOT EXISTS jobs_expires_at ON jobs(expires_at)")

    def create(self, source_url: str) -> str:
        now = time.time()
        job_id = str(uuid.uuid4())
        with self._connect() as connection:
            connection.execute(
                "INSERT INTO jobs VALUES (?, ?, 'queued', NULL, NULL, NULL, ?, ?, ?)",
                (job_id, source_url, now, now, now + self.retention_seconds),
            )
        return job_id

    def mark_running(self, job_id: str) -> None:
        self._update(job_id, "running")

    def mark_succeeded(self, job_id: str, product: dict[str, object]) -> None:
        now = time.time()
        payload = json.dumps(product, ensure_ascii=False, separators=(",", ":"))
        with self._connect() as connection:
            connection.execute(
                """UPDATE jobs SET state='succeeded', product_json=?, error_code=NULL,
                   error_message=NULL, updated_at=?, expires_at=? WHERE job_id=?""",
                (payload, now, now + self.retention_seconds, job_id),
            )

    def mark_failed(self, job_id: str, code: str, message: str) -> None:
        now = time.time()
        with self._connect() as connection:
            connection.execute(
                """UPDATE jobs SET state='failed', product_json=NULL, error_code=?,
                   error_message=?, updated_at=?, expires_at=? WHERE job_id=?""",
                (code, message, now, now + self.retention_seconds, job_id),
            )

    def _update(self, job_id: str, state: str) -> None:
        now = time.time()
        with self._connect() as connection:
            connection.execute(
                "UPDATE jobs SET state=?, updated_at=?, expires_at=? WHERE job_id=?",
                (state, now, now + self.retention_seconds, job_id),
            )

    def recover_incomplete(self) -> int:
        now = time.time()
        with self._connect() as connection:
            cursor = connection.execute(
                """UPDATE jobs SET state='failed', product_json=NULL,
                   error_code='service_restarted',
                   error_message='The crawler service restarted before this job completed.',
                   updated_at=?, expires_at=? WHERE state IN ('queued','running')""",
                (now, now + self.retention_seconds),
            )
            return cursor.rowcount

    def purge_expired(self) -> int:
        with self._connect() as connection:
            cursor = connection.execute("DELETE FROM jobs WHERE expires_at <= ?", (time.time(),))
            return cursor.rowcount

    def get(self, job_id: str) -> dict[str, object] | None:
        try:
            normalized = str(uuid.UUID(job_id))
        except (ValueError, TypeError, AttributeError):
            return None
        with self._connect() as connection:
            row = connection.execute("SELECT * FROM jobs WHERE job_id=?", (normalized,)).fetchone()
        if row is None or row["expires_at"] <= time.time():
            return None
        result: dict[str, object] = {"job_id": row["job_id"], "state": row["state"]}
        if row["state"] == "succeeded":
            result["product"] = json.loads(row["product_json"])
        elif row["state"] == "failed":
            result["error"] = {"code": row["error_code"], "message": row["error_message"]}
        return result
