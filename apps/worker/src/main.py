import logging

import structlog
from fastapi import FastAPI

from src.settings import settings

logging.basicConfig(level=logging.INFO)
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer(),
    ]
)
log = structlog.get_logger()

app = FastAPI(
    title="tiktok-clip-worker",
    version="0.0.0",
    docs_url=None if settings.environment == "production" else "/docs",
    redoc_url=None,
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "environment": settings.environment}


@app.on_event("startup")  # type: ignore[misc]
async def on_startup() -> None:
    log.info("worker_started", env=settings.environment, model=settings.whisper_model)
