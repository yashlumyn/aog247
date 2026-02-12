from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import router

app = FastAPI(title="AOG247 API")

app.add_middleware(
    CORSMiddleware,
     allow_origins=[
        "http://localhost:5173",
        "http://192.168.1.12:5173",  # your Mac IP
    ],
    allow_credentials=False,
    allow_methods=["POST"],
    allow_headers=["*"],
)

app.include_router(router)
