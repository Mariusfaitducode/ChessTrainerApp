import type { SQLiteDatabase } from 'expo-sqlite';
import type { Puzzle } from '../domain/types';

interface PuzzleRow {
  id: string;
  game_id: string;
  move_number: number;
  fen: string;
  played_move: string;
  best_move: string;
  quality: string;
  eval_loss: number;
  solved_at: number | null;
}

function rowToPuzzle(r: PuzzleRow): Puzzle {
  return {
    id: r.id,
    gameId: r.game_id,
    moveNumber: r.move_number,
    fen: r.fen,
    playedMove: r.played_move,
    bestMove: r.best_move,
    quality: r.quality as Puzzle['quality'],
    evalLoss: r.eval_loss,
    solvedAt: r.solved_at,
  };
}

export async function insertMany(db: SQLiteDatabase, puzzles: Puzzle[]): Promise<void> {
  if (puzzles.length === 0) return;
  await db.withTransactionAsync(async () => {
    for (const p of puzzles) {
      await db.runAsync(
        `INSERT OR IGNORE INTO puzzles
          (id, game_id, move_number, fen, played_move, best_move, quality, eval_loss, solved_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        p.id,
        p.gameId,
        p.moveNumber,
        p.fen,
        p.playedMove,
        p.bestMove,
        p.quality,
        p.evalLoss,
        p.solvedAt,
      );
    }
  });
}

export async function listAll(db: SQLiteDatabase): Promise<Puzzle[]> {
  const rows = await db.getAllAsync<PuzzleRow>(
    'SELECT * FROM puzzles ORDER BY move_number',
  );
  return rows.map(rowToPuzzle);
}

export async function listUnsolved(db: SQLiteDatabase): Promise<Puzzle[]> {
  const rows = await db.getAllAsync<PuzzleRow>(
    `SELECT * FROM puzzles WHERE solved_at IS NULL
     ORDER BY CASE quality
       WHEN 'blunder' THEN 0
       WHEN 'mistake' THEN 1
       WHEN 'inaccuracy' THEN 2
       ELSE 3
     END, move_number`,
  );
  return rows.map(rowToPuzzle);
}

export async function listByGame(
  db: SQLiteDatabase,
  gameId: string,
): Promise<Puzzle[]> {
  const rows = await db.getAllAsync<PuzzleRow>(
    'SELECT * FROM puzzles WHERE game_id = ? ORDER BY move_number',
    gameId,
  );
  return rows.map(rowToPuzzle);
}

export async function get(db: SQLiteDatabase, id: string): Promise<Puzzle | null> {
  const row = await db.getFirstAsync<PuzzleRow>(
    'SELECT * FROM puzzles WHERE id = ?',
    id,
  );
  return row ? rowToPuzzle(row) : null;
}

export async function markSolved(
  db: SQLiteDatabase,
  id: string,
  at: number,
): Promise<void> {
  await db.runAsync('UPDATE puzzles SET solved_at = ? WHERE id = ?', at, id);
}

export async function countUnsolved(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM puzzles WHERE solved_at IS NULL',
  );
  return row?.c ?? 0;
}

export async function deleteAll(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('DELETE FROM puzzles');
}
