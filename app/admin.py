from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
from typing import List
import asyncio
import json
import os
import shutil
import sys

from app.audit_log import read_entries, read_csv_bytes

router = APIRouter(prefix="/admin", tags=["admin"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_META_PATH = os.path.join(BASE_DIR, "artifacts", "releases", "v3.1.1", "model_meta.json")
BUILD_SCRIPT = os.path.join(BASE_DIR, "scripts", "build_memory.py")
TRAINING_DIR = os.path.join(BASE_DIR, "data", "derived", "renders_v2_baseline")
TRASH_DIR    = os.path.join(BASE_DIR, "data", "derived", "renders_v2_baseline_trash")
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"}

_build_lock = asyncio.Lock()


@router.get("/active-model")
async def get_active_model():
    if not os.path.exists(MODEL_META_PATH):
        raise HTTPException(status_code=404, detail="model_meta.json not found")
    with open(MODEL_META_PATH) as f:
        return json.load(f)


@router.post("/build")
async def build_memory_bank():
    if _build_lock.locked():
        raise HTTPException(status_code=409, detail="Build already in progress")

    async def stream():
        async with _build_lock:
            proc = await asyncio.create_subprocess_exec(
                sys.executable, BUILD_SCRIPT,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                cwd=BASE_DIR,
                env={**os.environ, "PYTHONPATH": BASE_DIR},
            )

            yield f"data: {json.dumps({'type': 'status', 'status': 'running'})}\n\n"

            summary = {}
            async for raw in proc.stdout:
                line = raw.decode().rstrip()
                yield f"data: {json.dumps({'type': 'log', 'line': line})}\n\n"
                if line.startswith("Images used:"):
                    summary["images"] = int(line.split(":")[-1].strip())
                elif line.startswith("Memory shape:"):
                    # e.g. "Memory shape: torch.Size([20000, 512])"
                    summary["memory_shape"] = line.split("torch.Size")[-1].strip()

            await proc.wait()
            status = "success" if proc.returncode == 0 else "failed"
            yield f"data: {json.dumps({'type': 'done', 'status': status, **summary})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


class ThresholdRequest(BaseModel):
    threshold: float


@router.post("/threshold")
async def set_threshold(body: ThresholdRequest):
    if body.threshold <= 0:
        raise HTTPException(status_code=422, detail="Threshold must be greater than 0")
    if not os.path.exists(MODEL_META_PATH):
        raise HTTPException(status_code=404, detail="model_meta.json not found")
    with open(MODEL_META_PATH) as f:
        meta = json.load(f)
    meta["threshold"] = body.threshold
    with open(MODEL_META_PATH, "w") as f:
        json.dump(meta, f, indent=2)
    return {"threshold": body.threshold}


@router.get("/log")
def get_audit_log():
    return read_entries()


@router.get("/log/download")
def download_audit_log():
    data = read_csv_bytes()
    return Response(
        content=data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=audit_log.csv"},
    )


# ---------------------------------------------------------------------------
# Training data management
# ---------------------------------------------------------------------------

def _list_training_images() -> list[str]:
    if not os.path.isdir(TRAINING_DIR):
        return []
    return sorted(
        f for f in os.listdir(TRAINING_DIR)
        if os.path.splitext(f)[1].lower() in IMAGE_EXTENSIONS
    )


@router.get("/training-images")
def list_training_images():
    files = _list_training_images()
    return {"count": len(files), "files": files}


@router.post("/training-images/upload")
async def upload_training_images(files: List[UploadFile] = File(...)):
    os.makedirs(TRAINING_DIR, exist_ok=True)
    saved = []
    for upload in files:
        filename = os.path.basename(upload.filename or "upload")
        ext = os.path.splitext(filename)[1].lower()
        if ext not in IMAGE_EXTENSIONS:
            raise HTTPException(status_code=422, detail=f"Unsupported file type: {ext}")
        dest = os.path.join(TRAINING_DIR, filename)
        with open(dest, "wb") as f:
            shutil.copyfileobj(upload.file, f)
        saved.append(filename)
    return {"saved": saved, "count": len(_list_training_images())}


def _trash(filename: str) -> None:
    """Move a file from TRAINING_DIR to TRASH_DIR."""
    os.makedirs(TRASH_DIR, exist_ok=True)
    shutil.move(os.path.join(TRAINING_DIR, filename), os.path.join(TRASH_DIR, filename))


@router.delete("/training-images")
def clear_training_images():
    files = _list_training_images()
    for f in files:
        _trash(f)
    return {"deleted": len(files), "count": 0}


@router.delete("/training-images/{filename}")
def delete_training_image(filename: str):
    safe_name = os.path.basename(filename)
    path = os.path.join(TRAINING_DIR, safe_name)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    _trash(safe_name)
    return {"deleted": safe_name, "count": len(_list_training_images())}
