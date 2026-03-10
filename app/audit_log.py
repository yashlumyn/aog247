import csv
import json
import os
from datetime import datetime, timezone
from pathlib import Path

BASE_DIR  = Path(__file__).parent.parent
LOG_PATH  = BASE_DIR / "artifacts" / "audit_log.csv"
META_PATH = BASE_DIR / "artifacts" / "releases" / "v3.1.1" / "model_meta.json"

FIELDS = ["timestamp", "model_id", "image_filename", "score", "is_anomalous"]


def _model_id() -> str:
    try:
        with open(META_PATH) as f:
            return json.load(f).get("model_id", "unknown")
    except Exception:
        return "unknown"


def append_entry(image_filename: str, score: float, is_anomalous: bool) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    write_header = not LOG_PATH.exists()
    with open(LOG_PATH, "a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        if write_header:
            writer.writeheader()
        writer.writerow({
            "timestamp":      datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "model_id":       _model_id(),
            "image_filename": image_filename,
            "score":          round(score, 6),
            "is_anomalous":   is_anomalous,
        })


def read_entries() -> list[dict]:
    if not LOG_PATH.exists():
        return []
    with open(LOG_PATH, newline="") as f:
        rows = list(csv.DictReader(f))
    return list(reversed(rows))  # newest first


def read_csv_bytes() -> bytes:
    if not LOG_PATH.exists():
        return b""
    with open(LOG_PATH, "rb") as f:
        return f.read()
