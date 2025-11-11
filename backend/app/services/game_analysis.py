"""Service d'analyse complète d'une partie d'échecs"""
import io
import logging
from dataclasses import dataclass
from typing import Optional

import chess
import chess.engine
import chess.pgn

from app.models import GameAnalysisResponse
from app.services.analysis import analyze_position

logger = logging.getLogger(__name__)


@dataclass
class MoveAnalysisResult:
    """Résultat intermédiaire pour l'analyse d'un coup."""

    move_number: int
    fen_before: str
    played_move: str
    best_move: Optional[str]
    opponent_best_move: Optional[str]  # Meilleur coup de l'adversaire après le coup joué
    evaluation_before: int  # centipawns
    evaluation_after: int  # centipawns
    move_quality: str
    game_phase: str
    evaluation_loss: float  # centipawns


def classify_move(
    eval_before: int,
    eval_after: int,
    eval_best_after: Optional[int],
    is_white: bool,
    played_move_uci: str,
    best_move_uci: Optional[str],
    move_number: int,
) -> tuple[str, str, float]:
    """
    Classifie un coup et retourne (move_quality, game_phase, evaluation_loss)

    move_quality: "best", "excellent", "good", "inaccuracy", "mistake", "blunder"
    game_phase: "opening", "middlegame", "endgame"
    evaluation_loss: en centipawns
    """
    if move_number <= 20:
        game_phase = "opening"
    elif move_number <= 40:
        game_phase = "middlegame"
    else:
        game_phase = "endgame"

    if eval_before == 0 and eval_after == 0:
        return ("good", game_phase, 0.0)

    moves_are_equal = best_move_uci and played_move_uci.lower() == best_move_uci.lower()
    if moves_are_equal:
        return ("best", game_phase, 0.0)

    if not is_white:
        eval_before = -eval_before
        eval_after = -eval_after
        if eval_best_after is not None:
            eval_best_after = -eval_best_after

    if eval_best_after is not None:
        evaluation_loss = abs(eval_after - eval_best_after)
    else:
        evaluation_loss = abs(eval_after - eval_before)

    if evaluation_loss < 10:
        move_quality = "excellent"
    elif evaluation_loss < 30:
        move_quality = "good"
    elif evaluation_loss < 100:
        move_quality = "inaccuracy"
    elif evaluation_loss < 300:
        move_quality = "mistake"
    else:
        move_quality = "blunder"

    return (move_quality, game_phase, evaluation_loss)


async def _evaluate_position(
    board: chess.Board,
    engine: chess.engine.SimpleEngine,
    depth: int,
) -> tuple[int, Optional[str]]:
    """
    Retourne l'évaluation en centipawns (du point de vue des blancs)
    et le meilleur coup en UCI pour une position donnée.
    """
    if board.is_game_over():
        if board.is_checkmate():
            eval_cp = -10000 if board.turn == chess.WHITE else 10000
        else:
            eval_cp = 0
        return eval_cp, None

    analysis = await analyze_position(board, engine, depth)
    return analysis.evaluation, analysis.best_move


async def _analyze_move(
    board: chess.Board,
    move_uci: str,
    engine: chess.engine.SimpleEngine,
    depth: int,
    move_number: int,
) -> MoveAnalysisResult:
    """Analyse un coup unique et retourne un résultat structuré."""
    fen_before = board.fen()
    is_white = board.turn == chess.WHITE

    eval_before, best_move_uci = await _evaluate_position(board, engine, depth)

    try:
        board.push(chess.Move.from_uci(move_uci))
    except ValueError as exc:
        raise RuntimeError(f"Coup UCI invalide: {move_uci}") from exc

    eval_after, opponent_best_move_uci = await _evaluate_position(board, engine, depth)

    eval_best_after: Optional[int] = None
    if best_move_uci and best_move_uci.lower() != move_uci.lower():
        try:
            temp_board = chess.Board(fen_before)
            temp_board.push(chess.Move.from_uci(best_move_uci))
            if not temp_board.is_game_over():
                eval_best_after, _ = await _evaluate_position(temp_board, engine, depth)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "[GameAnalysis] Erreur analyse meilleur coup pour move=%s: %s",
                move_uci,
                exc,
            )

    move_quality, game_phase, evaluation_loss = classify_move(
        eval_before,
        eval_after,
        eval_best_after,
        is_white,
        move_uci,
        best_move_uci,
        move_number,
    )

    return MoveAnalysisResult(
        move_number=move_number,
        fen_before=fen_before,
        played_move=move_uci,
        best_move=best_move_uci,
        opponent_best_move=opponent_best_move_uci,
        evaluation_before=eval_before,
        evaluation_after=eval_after,
        move_quality=move_quality,
        game_phase=game_phase,
        evaluation_loss=evaluation_loss,
    )


async def analyze_game(
    pgn: str,
    engine: chess.engine.SimpleEngine,
    depth: int,
) -> list[GameAnalysisResponse]:
    """
    Analyse complète d'une partie d'échecs

    Retourne toutes les analyses prêtes à être insérées dans la DB
    """
    logger.info("[GameAnalysis] Début analyse partie (depth=%s)", depth)

    try:
        pgn_io = io.StringIO(pgn)
        game = chess.pgn.read_game(pgn_io)
        if not game:
            raise ValueError("PGN invalide ou vide")
    except Exception as exc:  # noqa: BLE001
        logger.error("[GameAnalysis] Erreur parsing PGN: %s", exc)
        raise ValueError(f"PGN invalide: {exc}") from exc

    board = game.board()
    analyses: list[GameAnalysisResponse] = []

    for move_number, move in enumerate(game.mainline_moves(), start=1):
        move_uci = move.uci()
        logger.info(
            "[GameAnalysis] Analyse coup %s - FEN: %s...",
            move_number,
            board.fen()[:50],
        )

        try:
            result = await _analyze_move(board, move_uci, engine, depth, move_number)
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "[GameAnalysis] Erreur lors de l'analyse du coup %s (%s): %s",
                move_number,
                move_uci,
                exc,
            )
            continue

        analyses.append(
            GameAnalysisResponse(
                move_number=result.move_number,
                fen=result.fen_before,
                evaluation=result.evaluation_after / 100.0,
                best_move=result.best_move,
                played_move=result.played_move,
                move_quality=result.move_quality,
                game_phase=result.game_phase,
                evaluation_loss=result.evaluation_loss,
            )
        )

        logger.info(
            "[GameAnalysis] Coup %s analysé - quality=%s, loss=%.1fcp",
            result.move_number,
            result.move_quality,
            result.evaluation_loss,
        )

    logger.info(
        "[GameAnalysis] Analyse terminée - %s coups analysés", len(analyses)
    )
    return analyses


async def classify_move_in_position(
    board: chess.Board,
    move_uci: str,
    engine: chess.engine.SimpleEngine,
    depth: int,
) -> MoveAnalysisResult:
    """
    Classe un coup unique dans une position donnée.

    Le plateau est modifié (le coup est joué).
    """
    return await _analyze_move(board, move_uci, engine, depth, move_number=1)

