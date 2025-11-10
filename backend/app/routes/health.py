"""Routes de santé"""
from fastapi import APIRouter

from app.models import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Endpoint de santé pour vérifier que l'API est opérationnelle"""
    return HealthResponse(status="ok")

