"""Gestionnaire Stockfish adapté pour Vercel (serverless)"""
import asyncio
import logging
import os
from contextlib import asynccontextmanager
from typing import Optional

import chess.engine

logger = logging.getLogger(__name__)

# Cache global pour le moteur (partagé entre les requêtes dans la même instance)
_global_engine: Optional[chess.engine.SimpleEngine] = None
_global_lock = asyncio.Lock()


class StockfishManagerServerless:
    """
    Gestionnaire Stockfish adapté pour Vercel/serverless
    
    En mode serverless, on ne peut pas utiliser startup/shutdown events.
    On initialise Stockfish à la demande et on le garde en cache.
    """

    def __init__(self, path: str) -> None:
        self._path = path

    async def _ensure_engine(self) -> chess.engine.SimpleEngine:
        """Initialise le moteur si nécessaire (lazy initialization)"""
        global _global_engine

        async with _global_lock:
            if _global_engine is None:
                logger.info(f"[StockfishManager] Initialisation lazy de Stockfish: {self._path}")
                loop = asyncio.get_event_loop()

                def _launch() -> chess.engine.SimpleEngine:
                    return chess.engine.SimpleEngine.popen_uci(self._path)

                try:
                    _global_engine = await loop.run_in_executor(None, _launch)
                    logger.info("[StockfishManager] Stockfish initialisé avec succès")
                except FileNotFoundError as exc:
                    logger.error(f"[StockfishManager] Stockfish non trouvé: {self._path}")
                    raise RuntimeError(
                        f"Stockfish binary not found at '{self._path}'. Set STOCKFISH_PATH."
                    ) from exc
                except Exception as exc:  # noqa: BLE001
                    logger.error(f"[StockfishManager] Erreur initialisation Stockfish: {exc}")
                    raise RuntimeError(f"Unable to start Stockfish: {exc}") from exc

            return _global_engine

    @asynccontextmanager
    async def acquire(self) -> chess.engine.SimpleEngine:
        """Acquiert l'accès au moteur Stockfish (lazy initialization)"""
        engine = await self._ensure_engine()
        async with _global_lock:
            yield engine

