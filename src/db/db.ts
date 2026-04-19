import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function openDb(name = 'chesscorrect.db'): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  const db = await SQLite.openDatabaseAsync(name);
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync(SCHEMA_SQL);
  dbInstance = db;
  return db;
}

export async function resetDb(): Promise<void> {
  const db = await openDb();
  await db.execAsync(`
    DROP TABLE IF EXISTS puzzles;
    DROP TABLE IF EXISTS games;
    DROP TABLE IF EXISTS app_state;
  `);
  await db.execAsync(SCHEMA_SQL);
}

// Helper only used by tests; never used in app code.
export function __resetDbInstanceForTests(): void {
  dbInstance = null;
}
