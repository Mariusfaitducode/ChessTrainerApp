"""Point d'entrée de l'application FastAPI"""
import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse

from app.routes import analyze, health
from app.services.stockfish_manager import StockfishManager

load_dotenv()

# Configuration des logs
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

STOCKFISH_PATH = os.getenv("STOCKFISH_PATH", "stockfish")

# Initialiser le gestionnaire Stockfish
manager = StockfishManager(STOCKFISH_PATH)

# Créer l'application FastAPI
app = FastAPI(title="Chess Analyzer", version="1.0.0")

# Configuration CORS pour permettre les requêtes depuis l'app mobile
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En production, remplacer par les origines spécifiques
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configurer la dépendance pour les routes d'analyse
def get_engine_manager() -> StockfishManager:
    """Dependency pour obtenir le gestionnaire Stockfish"""
    return manager


analyze.set_engine_manager_dependency(get_engine_manager)

# Inclure les routes
app.include_router(health.router)
app.include_router(analyze.router)


@app.on_event("startup")
async def startup_event() -> None:
    """Démarre l'application et initialise Stockfish"""
    logger.info("[FastAPI] Démarrage de l'application...")
    await manager.start()
    logger.info("[FastAPI] Application démarrée, prête à recevoir des requêtes")


@app.on_event("shutdown")
async def shutdown_event() -> None:
    """Arrête l'application et ferme Stockfish"""
    await manager.stop()


@app.exception_handler(RuntimeError)
async def runtime_error_handler(
    request: Request, exc: RuntimeError
) -> JSONResponse:  # type: ignore[override]
    """Gestionnaire d'erreurs pour les RuntimeError"""
    logger.error(f"[FastAPI] RuntimeError: {exc}")
    return JSONResponse(status_code=500, content={"detail": str(exc)})
