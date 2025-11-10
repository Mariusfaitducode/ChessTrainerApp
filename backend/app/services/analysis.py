"""Service d'analyse de positions d'échecs"""
import asyncio
import logging
import time
from typing import Optional

import chess
import chess.engine

from app.models import AnalyzeResponse

logger = logging.getLogger(__name__)


async def analyze_position(
    board: chess.Board,
    engine: chess.engine.SimpleEngine,
    depth: int,
) -> AnalyzeResponse:
    """
    Analyse une position avec Stockfish
    
    Retourne toujours best_move en SAN pour uniformité
    """
    start_ts = time.perf_counter()
    logger.info(f"[Analysis] Début analyse avec Stockfish (depth={depth})")

    try:
        loop = asyncio.get_event_loop()

        def _analyse() -> chess.engine.InfoDict:
            limit = chess.engine.Limit(depth=depth)
            logger.info(f"[Analysis] Envoi commande à Stockfish: depth={depth}")
            result = engine.analyse(board, limit)
            logger.info("[Analysis] Stockfish a terminé l'analyse")
            return result

        info = await loop.run_in_executor(None, _analyse)
        logger.info(
            f"[Analysis] Analyse terminée - depth atteint: {info.get('depth')}, nodes: {info.get('nodes')}"
        )
    except chess.engine.EngineTerminatedError as exc:
        logger.error(f"[Analysis] Stockfish engine terminé: {exc}")
        raise RuntimeError("Stockfish engine terminated") from exc
    except chess.engine.EngineError as exc:
        logger.error(f"[Analysis] Erreur Stockfish: {exc}")
        raise RuntimeError(f"Stockfish error: {exc}") from exc

    elapsed_ms = (time.perf_counter() - start_ts) * 1000
    logger.info(f"[Analysis] Temps d'analyse: {elapsed_ms:.2f}ms")

    # Extraire le meilleur coup (UCI)
    pv = info.get("pv")
    best_move_uci = pv[0].uci() if pv else None
    logger.info(f"[Analysis] Meilleur coup UCI: {best_move_uci}")

    # Extraire l'évaluation
    score = info.get("score")
    evaluation_type = "cp"
    evaluation = 0
    mate_in: Optional[int] = None

    if score:
        relative = score.relative
        if relative.is_mate():
            evaluation_type = "mate"
            mate_in = relative.mate()
            evaluation = 0
            logger.info(f"[Analysis] Mate détecté: mate_in={mate_in}")
        else:
            evaluation = relative.score(mate_score=100000) or 0
            evaluation_type = "cp"
            logger.info(f"[Analysis] Évaluation: {evaluation} centipawns")

    result = AnalyzeResponse(
        best_move=best_move_uci,  # Toujours en UCI (format standard)
        evaluation=evaluation,
        evaluation_type=evaluation_type,
        depth=int(info.get("depth", depth)),
        mate_in=mate_in,
        nodes=info.get("nodes"),
        analysis_time_ms=round(elapsed_ms, 2),
    )

    logger.info(
        f"[Analysis] Réponse préparée - best_move={best_move_uci} (UCI), "
        f"eval={evaluation} {evaluation_type}, depth={result.depth}, time={result.analysis_time_ms}ms"
    )
    return result


def handle_terminal_position(board: chess.Board) -> AnalyzeResponse:
    """Gère les positions terminales (checkmate, stalemate, draw)"""
    logger.info("[Analysis] Position terminale détectée")

    if board.is_checkmate():
        logger.info("[Analysis] Checkmate détecté")
        return AnalyzeResponse(
            best_move=None,
            evaluation=0,
            evaluation_type="mate",
            depth=0,
            mate_in=0,
            nodes=None,
            analysis_time_ms=0.0,
        )
    else:
        logger.info("[Analysis] Stalemate ou draw détecté")
        return AnalyzeResponse(
            best_move=None,
            evaluation=0,
            evaluation_type="cp",
            depth=0,
            mate_in=None,
            nodes=None,
            analysis_time_ms=0.0,
        )

