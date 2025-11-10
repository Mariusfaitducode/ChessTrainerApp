"""Service d'analyse complète d'une partie d'échecs"""
import io
import logging
from typing import Optional

import chess
import chess.engine
import chess.pgn

from app.models import AnalyzeResponse, GameAnalysisResponse
from app.services.analysis import analyze_position, handle_terminal_position

logger = logging.getLogger(__name__)


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
    # Déterminer la phase de partie
    if move_number <= 20:
        game_phase = "opening"
    elif move_number <= 40:
        game_phase = "middlegame"
    else:
        game_phase = "endgame"

    # Si pas d'évaluation, considérer comme bon
    if eval_before == 0 and eval_after == 0:
        return ("good", game_phase, 0.0)

    # Vérifier si le coup joué est le meilleur coup
    moves_are_equal = (
        best_move_uci
        and played_move_uci.lower() == best_move_uci.lower()
    )

    if moves_are_equal:
        return ("best", game_phase, 0.0)

    # Calculer la perte d'évaluation
    # L'évaluation est toujours du point de vue des blancs
    # Si c'est un coup noir, on inverse le signe
    if not is_white:
        eval_before = -eval_before
        eval_after = -eval_after
        if eval_best_after is not None:
            eval_best_after = -eval_best_after

    # Calculer la perte par rapport au meilleur coup
    if eval_best_after is not None:
        evaluation_loss = abs(eval_after - eval_best_after)
    else:
        # Si on n'a pas l'évaluation après le meilleur coup, utiliser la différence avant/après
        evaluation_loss = abs(eval_after - eval_before)

    # Classifier selon la perte d'évaluation
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


async def analyze_game(
    pgn: str,
    engine: chess.engine.SimpleEngine,
    depth: int,
) -> list[GameAnalysisResponse]:
    """
    Analyse complète d'une partie d'échecs
    
    Retourne toutes les analyses prêtes à être insérées dans la DB
    """
    logger.info(f"[GameAnalysis] Début analyse partie (depth={depth})")

    try:
        pgn_io = io.StringIO(pgn)
        game = chess.pgn.read_game(pgn_io)
        if not game:
            raise ValueError("PGN invalide ou vide")
    except Exception as exc:
        logger.error(f"[GameAnalysis] Erreur parsing PGN: {exc}")
        raise ValueError(f"PGN invalide: {exc}") from exc

    board = game.board()
    analyses: list[GameAnalysisResponse] = []
    move_number = 0

    for node in game.mainline():
        move_number += 1
        move = node.move
        is_white = board.turn == chess.WHITE
        current_fen = board.fen()

        logger.info(
            f"[GameAnalysis] Analyse coup {move_number} - FEN: {current_fen[:50]}..."
        )

        # Analyser la position AVANT le coup
        if board.is_game_over():
            if board.is_checkmate():
                eval_before = -10000 if is_white else 10000
            else:
                eval_before = 0
            analysis_before: AnalyzeResponse = AnalyzeResponse(
                best_move=None,
                evaluation=eval_before,
                evaluation_type="mate" if board.is_checkmate() else "cp",
                depth=0,
                mate_in=0 if board.is_checkmate() else None,
                nodes=None,
                analysis_time_ms=0.0,
            )
        else:
            try:
                analysis_before = await analyze_position(board, engine, depth)
            except Exception as exc:
                logger.error(
                    f"[GameAnalysis] Erreur analyse position avant coup {move_number}: {exc}"
                )
                raise RuntimeError(
                    f"Erreur lors de l'analyse du coup {move_number}: {exc}"
                ) from exc

        eval_before = analysis_before.evaluation
        best_move_uci = analysis_before.best_move

        # Jouer le coup
        try:
            board.push(move)
        except Exception as exc:
            logger.error(
                f"[GameAnalysis] Erreur lors du coup {move_number}: {exc}"
            )
            continue

        played_move_uci = move.uci()
        fen_after = board.fen()

        # Analyser la position APRÈS le coup
        # IMPORTANT: L'évaluation doit toujours être du point de vue des blancs
        if board.is_game_over():
            if board.is_checkmate():
                # Si les blancs sont mat, évaluation très négative
                # Si les noirs sont mat, évaluation très positive
                eval_after = -10000 if board.turn == chess.WHITE else 10000
            else:
                eval_after = 0
            analysis_after: AnalyzeResponse = AnalyzeResponse(
                best_move=None,
                evaluation=eval_after,
                evaluation_type="mate" if board.is_checkmate() else "cp",
                depth=0,
                mate_in=0 if board.is_checkmate() else None,
                nodes=None,
                analysis_time_ms=0.0,
            )
        else:
            try:
                analysis_after = await analyze_position(board, engine, depth)
            except Exception as exc:
                logger.error(
                    f"[GameAnalysis] Erreur analyse position après coup {move_number}: {exc}"
                )
                raise RuntimeError(
                    f"Erreur lors de l'analyse du coup {move_number}: {exc}"
                ) from exc

        eval_after = analysis_after.evaluation

        # Calculer l'évaluation après le meilleur coup (si différent)
        eval_best_after: Optional[int] = None
        if (
            best_move_uci
            and best_move_uci.lower() != played_move_uci.lower()
        ):
            try:
                temp_board = chess.Board(current_fen)
                best_move_obj = chess.Move.from_uci(best_move_uci)
                temp_board.push(best_move_obj)

                if not temp_board.is_game_over():
                    analysis_best_after = await analyze_position(
                        temp_board, engine, depth
                    )
                    eval_best_after = analysis_best_after.evaluation
            except Exception as exc:
                logger.warning(
                    f"[GameAnalysis] Erreur analyse meilleur coup pour coup {move_number}: {exc}"
                )
                # Continuer sans eval_best_after

        # Classifier le coup
        # IMPORTANT: On passe les évaluations originales (du point de vue des blancs)
        # classify_move va les inverser localement pour le calcul de la perte, mais
        # on stocke toujours eval_after du point de vue des blancs
        move_quality, game_phase, evaluation_loss = classify_move(
            eval_before,
            eval_after,
            eval_best_after,
            is_white,
            played_move_uci,
            best_move_uci,
            move_number,
        )

        # Convertir l'évaluation en pawns (pour la DB)
        # IMPORTANT: Toujours stocker du point de vue des blancs (positif = avantage blanc)
        evaluation_pawns = eval_after / 100.0

        analyses.append(
            GameAnalysisResponse(
                move_number=move_number,
                fen=current_fen,
                evaluation=evaluation_pawns,
                best_move=best_move_uci,
                played_move=played_move_uci,
                move_quality=move_quality,
                game_phase=game_phase,
                evaluation_loss=evaluation_loss,
            )
        )

        logger.info(
            f"[GameAnalysis] Coup {move_number} analysé - quality={move_quality}, loss={evaluation_loss:.1f}cp"
        )

    logger.info(f"[GameAnalysis] Analyse terminée - {len(analyses)} coups analysés")
    return analyses

