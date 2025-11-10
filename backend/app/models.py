"""Modèles Pydantic pour les requêtes et réponses API"""
from typing import Optional

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    fen: str
    depth: int = Field(default=13, ge=1, le=25)


class AnalyzeResponse(BaseModel):
    best_move: Optional[str]  # Toujours en UCI (format standard)
    evaluation: int  # En centipawns
    evaluation_type: str  # "cp" ou "mate"
    depth: int
    mate_in: Optional[int] = None
    nodes: Optional[int] = None
    analysis_time_ms: float


class AnalyzeGameRequest(BaseModel):
    pgn: str
    depth: int = Field(default=13, ge=1, le=25)


class GameAnalysisResponse(BaseModel):
    """Analyse d'un coup d'une partie"""
    move_number: int
    fen: str
    evaluation: float  # En pawns (pour correspondre à la DB)
    best_move: Optional[str]  # UCI
    played_move: str  # UCI
    move_quality: str  # "best", "excellent", "good", "inaccuracy", "mistake", "blunder"
    game_phase: str  # "opening", "middlegame", "endgame"
    evaluation_loss: float  # En centipawns


class AnalyzeGameResponse(BaseModel):
    """Réponse pour l'analyse complète d'une partie"""
    analyses: list[GameAnalysisResponse]


class HealthResponse(BaseModel):
    status: str
