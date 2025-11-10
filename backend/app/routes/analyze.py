"""Routes pour l'analyse de positions"""
import logging
from typing import Annotated, Callable

import chess
from fastapi import APIRouter, Depends, HTTPException

from app.models import (
    AnalyzeRequest,
    AnalyzeResponse,
    AnalyzeGameRequest,
    AnalyzeGameResponse,
)
from app.services.analysis import analyze_position, handle_terminal_position
from app.services.game_analysis import analyze_game
from app.services.stockfish_manager import StockfishManager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["analysis"])

# La fonction de dépendance sera fournie depuis main.py
_engine_manager_dep: Callable[[], StockfishManager] | None = None


def set_engine_manager_dependency(dep: Callable[[], StockfishManager]) -> None:
    """Configure la dépendance pour le gestionnaire Stockfish"""
    global _engine_manager_dep
    _engine_manager_dep = dep


def get_engine_manager() -> StockfishManager:
    """Dependency pour obtenir le gestionnaire Stockfish"""
    if _engine_manager_dep is None:
        raise RuntimeError("Engine manager dependency not set")
    return _engine_manager_dep()


@router.post("/analyze-position", response_model=AnalyzeResponse)
async def analyze_position_endpoint(
    payload: AnalyzeRequest,
    engine_manager: Annotated[StockfishManager, Depends(get_engine_manager)],
) -> AnalyzeResponse:
    """
    Analyse une position d'échecs avec Stockfish
    
    Retourne le meilleur coup en SAN (Standard Algebraic Notation) pour uniformité
    """
    logger.info(
        f"[Analyze] Requête reçue - FEN: {payload.fen[:50]}..., depth: {payload.depth}"
    )

    try:
        board = chess.Board(payload.fen)
        logger.info("[Analyze] FEN valide, board créé")
    except ValueError as exc:
        logger.error(f"[Analyze] FEN invalide: {exc}")
        raise HTTPException(status_code=400, detail=f"Invalid FEN: {exc}") from exc

    # Gérer les positions terminales
    if board.is_game_over():
        return handle_terminal_position(board)

    # Analyser avec Stockfish
    try:
        async with engine_manager.acquire() as engine:
            return await analyze_position(board, engine, payload.depth)
    except RuntimeError as exc:
        logger.error(f"[Analyze] Erreur runtime: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        logger.error(f"[Analyze] Erreur inattendue: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Unexpected error: {exc}") from exc


@router.post("/analyze-game", response_model=AnalyzeGameResponse)
async def analyze_game_endpoint(
    payload: AnalyzeGameRequest,
    engine_manager: Annotated[StockfishManager, Depends(get_engine_manager)],
) -> AnalyzeGameResponse:
    """
    Analyse complète d'une partie d'échecs
    
    Retourne toutes les analyses prêtes à être insérées dans la DB
    """
    logger.info(
        f"[Analyze] Requête analyse partie reçue - depth: {payload.depth}, PGN length: {len(payload.pgn)}"
    )

    try:
        async with engine_manager.acquire() as engine:
            analyses = await analyze_game(payload.pgn, engine, payload.depth)
            return AnalyzeGameResponse(analyses=analyses)
    except ValueError as exc:
        logger.error(f"[Analyze] Erreur validation: {exc}")
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.error(f"[Analyze] Erreur runtime: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        logger.error(f"[Analyze] Erreur inattendue: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Unexpected error: {exc}") from exc

