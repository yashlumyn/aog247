from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.api import router

app = FastAPI(title="AOG247 API")

# CORS no longer required when serving frontend + API from same origin
# You can remove this block entirely for single-port PoC
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=False,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

app.include_router(router)

# Serve built frontend
app.mount(
    "/assets",
    StaticFiles(directory="ui/partsense-ui/dist/assets"),
    name="assets"
)

@app.get("/")
def serve_frontend():
    return FileResponse("ui/partsense-ui/dist/index.html")
