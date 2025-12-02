"""
Point d'entrée FastAPI adapté pour Vercel (serverless)
Utilise lazy initialization pour Stockfish
"""
import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse

from app.routes import analyze, health
from app.services.stockfish_manager_serverless import StockfishManagerServerless

load_dotenv()

# Configuration des logs
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M-%S",
)
logger = logging.getLogger(__name__)

# Sur Vercel, Stockfish est installé dans backend/bin/stockfish par le build script
# Vérifier si on est sur Vercel
IS_VERCEL = os.getenv("VERCEL") == "1"

if IS_VERCEL:
    # Sur Vercel, utiliser le chemin relatif depuis le build
    # Le build script installe Stockfish dans backend/bin/stockfish
    default_path = os.path.join(os.path.dirname(__file__), "..", "bin", "stockfish")
    STOCKFISH_PATH = os.getenv("STOCKFISH_PATH", default_path)
    logger.info(f"[FastAPI] Mode Vercel détecté, STOCKFISH_PATH: {STOCKFISH_PATH}")
else:
    STOCKFISH_PATH = os.getenv("STOCKFISH_PATH", "stockfish")

# Initialiser le gestionnaire Stockfish (serverless avec lazy init)
manager = StockfishManagerServerless(STOCKFISH_PATH)

# Créer l'application FastAPI
app = FastAPI(title="Chess Analyzer", version="1.0.0")

# Configuration CORS
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
if CORS_ORIGINS == "*":
    cors_origins = ["*"]
else:
    cors_origins = [origin.strip() for origin in CORS_ORIGINS.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configurer la dépendance pour les routes d'analyse
def get_engine_manager() -> StockfishManagerServerless:
    """Dependency pour obtenir le gestionnaire Stockfish"""
    return manager


analyze.set_engine_manager_dependency(get_engine_manager)

# Inclure les routes
app.include_router(health.router)
app.include_router(analyze.router)

# Pas d'événements startup/shutdown en serverless
# Stockfish sera initialisé à la demande (lazy)

@app.exception_handler(RuntimeError)
async def runtime_error_handler(
    request: Request, exc: RuntimeError
) -> JSONResponse:  # type: ignore[override]
    """Gestionnaire d'erreurs pour les RuntimeError"""
    logger.error(f"[FastAPI] RuntimeError: {exc}")
    return JSONResponse(status_code=500, content={"detail": str(exc)})

