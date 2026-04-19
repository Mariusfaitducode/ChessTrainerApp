import { openDb } from "@/db/db";
import * as gameRepo from "@/db/gameRepo";
import * as puzzleRepo from "@/db/puzzleRepo";
import { parseGame, playerColor } from "@/domain/pgn";
import { extractPuzzles } from "@/domain/puzzleExtractor";
import type { MoveEvaluation } from "@/domain/types";
import { getRecentGames } from "./chesscom";
import type { ChessEngine } from "./stockfish.types";

interface SyncOptions {
  username: string;
  engine: ChessEngine;
  max?: number;
  depth?: number;
  signal?: AbortSignal;
  onProgress?: (current: number, total: number) => void;
}

export async function syncAndAnalyze({
  username,
  engine,
  max = 20,
  depth = 15,
  signal,
  onProgress,
}: SyncOptions): Promise<void> {
  const db = await openDb();

  const fetched = await getRecentGames(username, max);
  await gameRepo.insertMany(db, fetched);
  if (signal?.aborted) return;

  const todo = await gameRepo.listUnanalyzed(db);
  await engine.init();
  try {
    for (let i = 0; i < todo.length; i++) {
      if (signal?.aborted) return;
      const g = todo[i];
      try {
        const parsed = parseGame(g.pgn);
        const color = playerColor(parsed.headers, username);

        const evaluations: MoveEvaluation[] = [];
        for (const m of parsed.moves) {
          if (signal?.aborted) return;
          const before = await engine.evaluate(m.fenBefore, depth);
          const after = await engine.evaluate(m.fenAfter, depth);
          evaluations.push({
            moveNumber: m.moveNumber,
            fen: m.fenBefore,
            playedMove: m.uci,
            evalBefore: before.cp,
            evalAfter: after.cp,
            bestMove: before.bestMove,
          });
        }

        const puzzles = extractPuzzles(
          evaluations,
          color,
          g.id,
          () => `p-${g.id}-${Math.random().toString(36).slice(2, 10)}`,
        );
        await puzzleRepo.insertMany(db, puzzles);
        await gameRepo.markAnalyzed(db, g.id, Date.now());
      } catch (e) {
        // Per-game failure does not abort the whole sync.
        console.warn(`[sync] game ${g.id} failed:`, e);
      }
      onProgress?.(i + 1, todo.length);
    }
  } finally {
    await engine.dispose();
  }
}
