# Backend FastAPI

## Overview

This backend exposes a single `/analyze-position` endpoint that runs Stockfish to evaluate a chess position.

## Requirements

- Python 3.11+
- Stockfish engine installed locally (`stockfish` binary available in `PATH`) or provide the path via `STOCKFISH_PATH` env var

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `STOCKFISH_PATH` | `stockfish` | Path to the Stockfish binary |
| `MAX_DEPTH` | `25` | Maximum allowed search depth |
| `DEFAULT_DEPTH` | `15` | Default depth when none provided |

You can set them in a `.env` file placed in `backend/`.

## Run locally

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API

### `POST /analyze-position`

```json
{
  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "depth": 15
}
```

Response:

```json
{
  "best_move": "e2e4",
  "evaluation": 35,
  "evaluation_type": "cp",
  "depth": 15,
  "mate_in": null,
  "nodes": 123456,
  "analysis_time_ms": 842.5
}
```

## Health check

- `GET /health` → `{ "status": "ok" }`

## Notes

- A single Stockfish process is reused across requests (protected by an async lock)
- Depth is clamped between 1 and `MAX_DEPTH`
- Evaluation is returned in centipawns; if a mate is detected, `evaluation_type` becomes `mate` and `mate_in` indicates moves to mate
