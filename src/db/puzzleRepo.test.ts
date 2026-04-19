import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';
import * as puzzleRepo from './puzzleRepo';
import * as gameRepo from './gameRepo';
import type { Puzzle, Game } from '../domain/types';

async function freshDb() {
  const db = await SQLite.openDatabaseAsync(':memory:');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync(SCHEMA_SQL);
  return db;
}

function sampleGame(id: string): Game {
  return {
    id,
    playedAt: 1000,
    white: 'A',
    black: 'B',
    result: '1-0',
    userColor: 'w',
    timeClass: null,
    pgn: '',
    analyzedAt: null,
  };
}

function samplePuzzle(overrides: Partial<Puzzle> = {}): Puzzle {
  return {
    id: 'p1',
    gameId: 'g1',
    moveNumber: 10,
    fen: 'fen',
    playedMove: 'e2e4',
    bestMove: 'd2d4',
    quality: 'blunder',
    evalLoss: 500,
    solvedAt: null,
    ...overrides,
  };
}

describe('puzzleRepo', () => {
  it('insertMany + listAll round trip', async () => {
    const db = await freshDb();
    await gameRepo.insertMany(db, [sampleGame('g1')]);
    await puzzleRepo.insertMany(db, [
      samplePuzzle({ id: 'p1' }),
      samplePuzzle({ id: 'p2' }),
    ]);
    const rows = await puzzleRepo.listAll(db);
    expect(rows).toHaveLength(2);
  });

  it('listUnsolved filters solvedAt NOT NULL', async () => {
    const db = await freshDb();
    await gameRepo.insertMany(db, [sampleGame('g1')]);
    await puzzleRepo.insertMany(db, [
      samplePuzzle({ id: 'p1', solvedAt: null }),
      samplePuzzle({ id: 'p2', solvedAt: 999 }),
    ]);
    const rows = await puzzleRepo.listUnsolved(db);
    expect(rows.map((p) => p.id)).toEqual(['p1']);
  });

  it('listByGame filters by gameId', async () => {
    const db = await freshDb();
    await gameRepo.insertMany(db, [sampleGame('g1'), sampleGame('g2')]);
    await puzzleRepo.insertMany(db, [
      samplePuzzle({ id: 'p1', gameId: 'g1' }),
      samplePuzzle({ id: 'p2', gameId: 'g2' }),
    ]);
    const rows = await puzzleRepo.listByGame(db, 'g1');
    expect(rows.map((p) => p.id)).toEqual(['p1']);
  });

  it('markSolved updates solvedAt', async () => {
    const db = await freshDb();
    await gameRepo.insertMany(db, [sampleGame('g1')]);
    await puzzleRepo.insertMany(db, [samplePuzzle({ id: 'p1', solvedAt: null })]);
    await puzzleRepo.markSolved(db, 'p1', 12345);
    const p = await puzzleRepo.get(db, 'p1');
    expect(p?.solvedAt).toBe(12345);
  });

  it('countUnsolved returns a scalar number', async () => {
    const db = await freshDb();
    await gameRepo.insertMany(db, [sampleGame('g1')]);
    await puzzleRepo.insertMany(db, [
      samplePuzzle({ id: 'p1', solvedAt: null }),
      samplePuzzle({ id: 'p2', solvedAt: null }),
      samplePuzzle({ id: 'p3', solvedAt: 5 }),
    ]);
    const n = await puzzleRepo.countUnsolved(db);
    expect(n).toBe(2);
  });

  it('cascades delete when parent game is removed', async () => {
    const db = await freshDb();
    await gameRepo.insertMany(db, [sampleGame('g1')]);
    await puzzleRepo.insertMany(db, [samplePuzzle({ id: 'p1', gameId: 'g1' })]);
    await gameRepo.deleteAll(db);
    const rows = await puzzleRepo.listAll(db);
    expect(rows).toEqual([]);
  });
});
