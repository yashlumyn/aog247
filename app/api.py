from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
import tempfile

from pipeline.ingest import ingest
from pipeline.detect import detect_anomaly
from app.audit_log import append_entry
from app.feedback import append_feedback


router = APIRouter()

@router.post("/detect_anomaly")
async def detect_anomaly_api(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    result = detect_anomaly(tmp_path)

    append_entry(
        image_filename=file.filename or "unknown",
        score=result["score"],
        is_anomalous=result["is_anomalous"],
    )

    return {
        "score": result["score"],
        "is_anomalous": result["is_anomalous"],
        "heatmap": result["heatmap"],
    }


DEFECT_CATEGORIES = {"Crack", "Corrosion", "Dent", "Scratch", "Other"}


class FeedbackRequest(BaseModel):
    image_filename: str
    anomaly_score: float
    is_anomalous: bool
    verdict: str  # "accept" | "reject"
    defect_category: Optional[str] = None


@router.post("/feedback")
def submit_feedback(req: FeedbackRequest):
    if req.verdict not in ("accept", "reject"):
        raise HTTPException(status_code=422, detail="verdict must be 'accept' or 'reject'")
    if req.defect_category is not None and req.defect_category not in DEFECT_CATEGORIES:
        raise HTTPException(status_code=422, detail=f"defect_category must be one of {sorted(DEFECT_CATEGORIES)}")
    append_feedback(
        image_filename=req.image_filename,
        anomaly_score=req.anomaly_score,
        is_anomalous=req.is_anomalous,
        technician_verdict=req.verdict,
        defect_category=req.defect_category,
    )
    return {"status": "ok"}


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
