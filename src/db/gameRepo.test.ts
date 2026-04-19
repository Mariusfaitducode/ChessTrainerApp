import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';
import * as gameRepo from './gameRepo';
import type { Game } from '../domain/types';

async function freshDb() {
  const db = await SQLite.openDatabaseAsync(':memory:');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync(SCHEMA_SQL);
  return db;
}

function sampleGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 'g1',
    playedAt: 1_700_000_000_000,
    white: 'AliceB',
    black: 'marius123',
    result: '1-0',
    userColor: 'b',
    timeClass: 'blitz',
    pgn: '1. e4 e5',
    analyzedAt: null,
    ...overrides,
  };
}

describe('gameRepo', () => {
  it('insertMany + listAll round trip', async () => {
    const db = await freshDb();
    await gameRepo.insertMany(db, [sampleGame({ id: 'a' }), sampleGame({ id: 'b' })]);
    const rows = await gameRepo.listAll(db);
    expect(rows).toHaveLength(2);
    expect(rows.map((g) => g.id).sort()).toEqual(['a', 'b']);
  });

  it('insertMany is idempotent — duplicates are ignored by PK', async () => {
    const db = await freshDb();
    await gameRepo.insertMany(db, [sampleGame({ id: 'a' })]);
    await gameRepo.insertMany(db, [sampleGame({ id: 'a', pgn: 'different' })]);
    const rows = await gameRepo.listAll(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].pgn).toBe('1. e4 e5');
  });

  it('listAll sorts by playedAt DESC', async () => {
    const db = await freshDb();
    await gameRepo.insertMany(db, [
      sampleGame({ id: 'old', playedAt: 1000 }),
      sampleGame({ id: 'new', playedAt: 2000 }),
    ]);
    const rows = await gameRepo.listAll(db);
    expect(rows[0].id).toBe('new');
    expect(rows[1].id).toBe('old');
  });

  it('markAnalyzed updates analyzed_at', async () => {
    const db = await freshDb();
    await gameRepo.insertMany(db, [sampleGame({ id: 'a' })]);
    await gameRepo.markAnalyzed(db, 'a', 5555);
    const g = await gameRepo.get(db, 'a');
    expect(g?.analyzedAt).toBe(5555);
  });

  it('listUnanalyzed returns only games with analyzed_at NULL', async () => {
    const db = await freshDb();
    await gameRepo.insertMany(db, [
      sampleGame({ id: 'done', analyzedAt: 111 }),
      sampleGame({ id: 'todo', analyzedAt: null }),
    ]);
    const rows = await gameRepo.listUnanalyzed(db);
    expect(rows.map((g) => g.id)).toEqual(['todo']);
  });

  it('deleteAll wipes games', async () => {
    const db = await freshDb();
    await gameRepo.insertMany(db, [sampleGame({ id: 'a' })]);
    await gameRepo.deleteAll(db);
    const rows = await gameRepo.listAll(db);
    expect(rows).toEqual([]);
  });
});
