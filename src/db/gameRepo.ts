import type { SQLiteDatabase } from 'expo-sqlite';
import type { Game, GameResult, Color } from '../domain/types';

interface GameRow {
  id: string;
  played_at: number;
  white: string;
  black: string;
  result: string;
  user_color: string;
  time_class: string | null;
  pgn: string;
  analyzed_at: number | null;
}

function rowToGame(r: GameRow): Game {
  return {
    id: r.id,
    playedAt: r.played_at,
    white: r.white,
    black: r.black,
    result: r.result as GameResult,
    userColor: r.user_color as Color,
    timeClass: r.time_class,
    pgn: r.pgn,
    analyzedAt: r.analyzed_at,
  };
}

export async function insertMany(db: SQLiteDatabase, games: Game[]): Promise<void> {
  if (games.length === 0) return;
  await db.withTransactionAsync(async () => {
    for (const g of games) {
      await db.runAsync(
        `INSERT OR IGNORE INTO games
          (id, played_at, white, black, result, user_color, time_class, pgn, analyzed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        g.id,
        g.playedAt,
        g.white,
        g.black,
        g.result,
        g.userColor,
        g.timeClass,
        g.pgn,
        g.analyzedAt,
      );
    }
  });
}

export async function listAll(db: SQLiteDatabase): Promise<Game[]> {
  const rows = await db.getAllAsync<GameRow>(
    'SELECT * FROM games ORDER BY played_at DESC',
  );
  return rows.map(rowToGame);
}

export async function get(db: SQLiteDatabase, id: string): Promise<Game | null> {
  const row = await db.getFirstAsync<GameRow>('SELECT * FROM games WHERE id = ?', id);
  return row ? rowToGame(row) : null;
}

export async function listUnanalyzed(db: SQLiteDatabase): Promise<Game[]> {
  const rows = await db.getAllAsync<GameRow>(
    'SELECT * FROM games WHERE analyzed_at IS NULL ORDER BY played_at DESC',
  );
  return rows.map(rowToGame);
}

export async function markAnalyzed(
  db: SQLiteDatabase,
  id: string,
  at: number,
): Promise<void> {
  await db.runAsync('UPDATE games SET analyzed_at = ? WHERE id = ?', at, id);
}

export async function deleteAll(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('DELETE FROM games');
}
