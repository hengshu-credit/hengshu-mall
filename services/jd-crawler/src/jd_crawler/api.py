"""Small standard-library HTTP API for the mall integration."""

from __future__ import annotations

import hmac
import json
import re
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from .contract import ContractError, canonicalize_item_url
from .jobs import BusyError, JobManager
from .store import JobStore


_JOB_PATH = re.compile(r"/v1/jobs/([0-9a-fA-F-]{36})")
_MAX_BODY_BYTES = 16 * 1024


def create_server(
    host: str,
    port: int,
    token: str,
    store: JobStore,
    manager: JobManager,
) -> ThreadingHTTPServer:
    if not token:
        raise ValueError("JD_CRAWLER_TOKEN must not be empty")

    class Handler(BaseHTTPRequestHandler):
        server_version = "jd-crawler"
        sys_version = ""

        def do_GET(self) -> None:
            if not self._authenticate():
                return
            if self.path == "/health":
                self._send_json(HTTPStatus.OK, {"state": "busy" if manager.is_busy() else "ready"})
                return
            matched = _JOB_PATH.fullmatch(self.path)
            if matched:
                store.purge_expired()
                job = store.get(matched.group(1))
                if job is None:
                    self._error(HTTPStatus.NOT_FOUND, "not_found", "The crawler job was not found.")
                else:
                    self._send_json(HTTPStatus.OK, job)
                return
            self._error(HTTPStatus.NOT_FOUND, "not_found", "The endpoint was not found.")

        def do_POST(self) -> None:
            if not self._authenticate():
                return
            if self.path != "/v1/jobs":
                self._error(HTTPStatus.NOT_FOUND, "not_found", "The endpoint was not found.")
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                length = -1
            if length <= 0 or length > _MAX_BODY_BYTES:
                self._error(HTTPStatus.BAD_REQUEST, "invalid_request", "A JSON request body is required.")
                return
            try:
                payload = json.loads(self.rfile.read(length))
            except (UnicodeDecodeError, ValueError):
                self._error(HTTPStatus.BAD_REQUEST, "invalid_request", "The request body must be valid JSON.")
                return
            if not isinstance(payload, dict) or set(payload) != {"url"}:
                self._error(HTTPStatus.BAD_REQUEST, "invalid_request", "The request body must contain only url.")
                return
            try:
                source_url = canonicalize_item_url(payload.get("url"))
            except ContractError as error:
                self._error(HTTPStatus.BAD_REQUEST, error.code, error.message)
                return
            try:
                created = manager.submit(source_url)
            except BusyError as error:
                self._error(HTTPStatus.CONFLICT, error.code, error.message)
                return
            self._send_json(HTTPStatus.ACCEPTED, created)

        def _authenticate(self) -> bool:
            supplied = self.headers.get("Authorization", "")
            expected = f"Bearer {token}"
            if not hmac.compare_digest(supplied.encode("utf-8"), expected.encode("utf-8")):
                self._error(
                    HTTPStatus.UNAUTHORIZED,
                    "unauthorized",
                    "Bearer authentication is required.",
                )
                return False
            return True

        def _error(self, status: HTTPStatus, code: str, message: str) -> None:
            self._send_json(status, {"error": {"code": code, "message": message}})

        def _send_json(self, status: HTTPStatus, payload: object) -> None:
            encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
            self.send_response(status.value)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(encoded)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            self.wfile.write(encoded)

        def log_message(self, format: str, *args: object) -> None:
            return

    return ThreadingHTTPServer((host, port), Handler)
