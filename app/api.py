from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel
import tempfile

from pipeline.ingest import ingest
from pipeline.detect import detect_anomaly


router = APIRouter()

from fastapi import UploadFile, File

@router.post("/detect_anomaly")
async def detect_anomaly_api(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    result = detect_anomaly(tmp_path)

    return {
        "score": result["score"],
        "is_anomalous": result["is_anomalous"],
        "heatmap": result["heatmap"],
                }


class IngestRequest(BaseModel):
    part_name: str
    source: str = "manual"

@router.get("/health")
def health():
    return {"status": "ok"}

@router.post("/ingest")
def ingest_endpoint(req: IngestRequest):
    job_id = ingest(
        part_name=req.part_name,
        source=req.source
    )
    return {"job_id": job_id}
