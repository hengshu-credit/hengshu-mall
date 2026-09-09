"""Environment configuration with bounded operational values."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    token: str
    host: str
    port: int
    data_dir: Path
    timeout_seconds: int
    retention_seconds: float

    @classmethod
    def from_environment(cls) -> "Settings":
        token = os.environ.get("JD_CRAWLER_TOKEN", "")
        if not 32 <= len(token) <= 256 or any(ord(char) < 33 or ord(char) > 126 for char in token):
            raise ValueError("JD_CRAWLER_TOKEN must contain 32 to 256 printable ASCII characters without spaces")
        host = os.environ.get("JD_CRAWLER_HOST", "0.0.0.0")
        port = _integer("JD_CRAWLER_PORT", 8091, 1, 65535)
        timeout = _integer("JD_CRAWLER_JOB_TIMEOUT", 240, 1, 300)
        retention_hours = _number("JD_CRAWLER_RETENTION_HOURS", 24, 0.01, 24 * 30)
        return cls(
            token=token,
            host=host,
            port=port,
            data_dir=Path(os.environ.get("JD_CRAWLER_DATA_DIR", "/data")),
            timeout_seconds=timeout,
            retention_seconds=retention_hours * 3600,
        )


def _integer(name: str, default: int, minimum: int, maximum: int) -> int:
    try:
        value = int(os.environ.get(name, str(default)))
    except ValueError as exc:
        raise ValueError(f"{name} must be an integer") from exc
    if not minimum <= value <= maximum:
        raise ValueError(f"{name} must be between {minimum} and {maximum}")
    return value


def _number(name: str, default: float, minimum: float, maximum: float) -> float:
    try:
        value = float(os.environ.get(name, str(default)))
    except ValueError as exc:
        raise ValueError(f"{name} must be a number") from exc
    if not minimum <= value <= maximum:
        raise ValueError(f"{name} must be between {minimum} and {maximum}")
    return value
