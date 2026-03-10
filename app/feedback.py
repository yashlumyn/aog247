import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

BASE_DIR  = Path(__file__).resolve().parent.parent
DB_PATH   = BASE_DIR / "artifacts" / "feedback.db"
META_PATH = BASE_DIR / "artifacts" / "releases" / "v3.1.1" / "model_meta.json"


def _model_version() -> str:
    try:
        with open(META_PATH) as f:
            return json.load(f).get("model_id", "unknown")
    except Exception:
        return "unknown"


def _init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS feedback (
                id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp           TEXT    NOT NULL,
                image_filename      TEXT    NOT NULL,
                anomaly_score       REAL    NOT NULL,
                is_anomalous        INTEGER NOT NULL,
                technician_verdict  TEXT    NOT NULL,
                model_version       TEXT    NOT NULL,
                defect_category     TEXT
            )
        """)
        # Migrate existing DBs that pre-date this column
        try:
            conn.execute("ALTER TABLE feedback ADD COLUMN defect_category TEXT")
        except sqlite3.OperationalError:
            pass  # Column already exists


def append_feedback(
    image_filename: str,
    anomaly_score: float,
    is_anomalous: bool,
    technician_verdict: str,
    defect_category: Optional[str] = None,
) -> None:
    _init_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            INSERT INTO feedback
                (timestamp, image_filename, anomaly_score, is_anomalous, technician_verdict, model_version, defect_category)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                datetime.now(timezone.utc).isoformat(),
                image_filename,
                anomaly_score,
                int(is_anomalous),
                technician_verdict,
                _model_version(),
                defect_category,
            ),
        )
