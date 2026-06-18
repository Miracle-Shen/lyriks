import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.service.mascot_service import mascot_service
from app.service.task import start_cleanup_loop, stop_cleanup_loop
from app.utils.telemetry.workforce_metrics import (
    initialize_tracer_provider,
    shutdown_tracer_provider,
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    initialize_tracer_provider()
    await start_cleanup_loop()
    await mascot_service.startup()
    try:
        yield
    finally:
        await mascot_service.shutdown()
        await stop_cleanup_loop()
        shutdown_tracer_provider()


api = FastAPI(
    title="Lyriks Emotion Mascot Backend",
    version="0.2.0",
    lifespan=lifespan,
)

if not logging.getLogger().handlers:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

api.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods=["*"],
    allow_origins=["*"],
)
