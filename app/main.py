from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.api import router
import os

app = FastAPI(title="AOG247 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://192.168.1.12:5173",
    ],
    allow_credentials=False,
    allow_methods=["POST"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/version")
def version():
    return {"branch": "demo"}

# --------- Serve React Build ---------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(BASE_DIR, "../ui/partsense-ui/dist")

app.mount(
    "/assets",
    StaticFiles(directory=os.path.join(DIST_DIR, "assets")),
    name="assets"
)

@app.get("/")
def serve_index():
    return FileResponse(os.path.join(DIST_DIR, "index.html"))
