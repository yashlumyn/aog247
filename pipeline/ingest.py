import json
import uuid
from pathlib import Path
from datetime import datetime

DATA_ROOT = Path("data/raw")

def ingest(part_name: str, source: str = "manual"):
    job_id = str(uuid.uuid4())
    part_dir = DATA_ROOT / job_id
    part_dir.mkdir(parents=True, exist_ok=False)

    meta = {
        "job_id": job_id,
        "part_name": part_name,
        "source": source,
        "created_at": datetime.utcnow().isoformat(),
        "status": "INGESTED"
    }

    with open(part_dir / "meta.json", "w") as f:
        json.dump(meta, f, indent=2)

    return job_id

if __name__ == "__main__":
    jid = ingest(part_name="test_part")
    print(f"Ingested job {jid}")
