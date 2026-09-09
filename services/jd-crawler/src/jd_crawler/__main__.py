"""Run the crawler API."""

from __future__ import annotations

import sys

from .api import create_server
from .jobs import JobManager
from .settings import Settings
from .store import JobStore


def main() -> int:
    try:
        settings = Settings.from_environment()
    except ValueError as error:
        print(f"configuration error: {error}", file=sys.stderr)
        return 2
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    store = JobStore(settings.data_dir / "jobs.sqlite3", settings.retention_seconds)
    manager = JobManager(
        store,
        settings.data_dir / "worker-results",
        timeout_seconds=settings.timeout_seconds,
    )
    server = create_server(settings.host, settings.port, settings.token, store, manager)
    try:
        server.serve_forever(poll_interval=0.5)
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
