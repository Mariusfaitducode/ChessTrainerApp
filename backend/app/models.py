"""Modèles Pydantic pour les requêtes et réponses API"""
from typing import Optional

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    fen: str
    depth: int = Field(default=13, ge=1, le=25)


class AnalyzeResponse(BaseModel):
    best_move: Optional[str]  # Toujours en SAN
    best_move_uci: Optional[str]  # UCI pour référence
    evaluation: int  # En centipawns
    evaluation_type: str  # "cp" ou "mate"
    depth: int
    mate_in: Optional[int] = None
    nodes: Optional[int] = None
    analysis_time_ms: float


class HealthResponse(BaseModel):
    status: str

