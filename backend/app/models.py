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
    move_quality: str  # "best", "excellent", "good", "inaccuracy", "mistake", "blunder", "miss"
    game_phase: str  # "opening", "middlegame", "endgame"
    evaluation_loss: float  # En centipawns
    evaluation_type: str  # "cp" ou "mate"
    mate_in: Optional[int]  # Nombre de coups jusqu'au mat (si evaluation_type == "mate")


class AnalyzeGameResponse(BaseModel):
    """Réponse pour l'analyse complète d'une partie"""
    analyses: list[GameAnalysisResponse]


class ClassifyMoveRequest(BaseModel):
    fen: str
    move_uci: str  # Coup joué en UCI
    depth: int = Field(default=13, ge=1, le=25)


class ClassifyMoveResponse(BaseModel):
    """Classification d'un coup"""
    move_quality: str  # "best", "excellent", "good", "inaccuracy", "mistake", "blunder", "miss"
    evaluation_loss: float  # En centipawns
    best_move: Optional[str]  # UCI - meilleur coup dans la position initiale
    opponent_best_move: Optional[str]  # UCI - meilleur coup de l'adversaire après le coup joué
    evaluation_before: float  # En pawns (du point de vue des blancs)
    evaluation_after: float  # En pawns (du point de vue des blancs)
    evaluation_type_after: str  # "cp" ou "mate"
    mate_in_after: Optional[int]  # Nombre de coups jusqu'au mat (si evaluation_type_after == "mate")


class HealthResponse(BaseModel):
    status: str
