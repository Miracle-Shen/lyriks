import logging

from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger("lyriks.health_controller")
router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    service: str


@router.get("/health", name="health check", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    logger.debug("Health check requested")
    return HealthResponse(status="ok", service="lyriks-emotion-mascot")
