"""Gestionnaire pour le moteur Stockfish"""
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Optional

import chess.engine

logger = logging.getLogger(__name__)


class StockfishManager:
    """Gère le cycle de vie et l'accès thread-safe au moteur Stockfish"""

    def __init__(self, path: str) -> None:
        self._path = path
        self._engine: Optional[chess.engine.SimpleEngine] = None
        self._lock = asyncio.Lock()

    async def start(self) -> None:
        """Démarre le moteur Stockfish"""
        logger.info(f"[StockfishManager] Démarrage de Stockfish depuis: {self._path}")
        loop = asyncio.get_event_loop()

        def _launch() -> chess.engine.SimpleEngine:
            return chess.engine.SimpleEngine.popen_uci(self._path)

        try:
            self._engine = await loop.run_in_executor(None, _launch)
            logger.info("[StockfishManager] Stockfish démarré avec succès")
        except FileNotFoundError as exc:
            logger.error(f"[StockfishManager] Stockfish non trouvé: {self._path}")
            raise RuntimeError(
                f"Stockfish binary not found at '{self._path}'. Set STOCKFISH_PATH."
            ) from exc
        except Exception as exc:  # noqa: BLE001
            logger.error(f"[StockfishManager] Erreur démarrage Stockfish: {exc}")
            raise RuntimeError(f"Unable to start Stockfish: {exc}") from exc

    async def stop(self) -> None:
        """Arrête le moteur Stockfish"""
        if not self._engine:
            return
        loop = asyncio.get_event_loop()

        async with self._lock:
            engine = self._engine
            self._engine = None

        if engine:
            await loop.run_in_executor(None, engine.quit)
            logger.info("[StockfishManager] Stockfish arrêté")

    @asynccontextmanager
    async def acquire(self) -> chess.engine.SimpleEngine:
        """Acquiert l'accès exclusif au moteur Stockfish"""
        if not self._engine:
            raise RuntimeError("Stockfish engine not initialized")

        async with self._lock:
            yield self._engine

