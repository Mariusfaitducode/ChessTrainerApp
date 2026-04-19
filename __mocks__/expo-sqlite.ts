// Test-only mock for expo-sqlite backed by better-sqlite3.
// Implements the subset of the async API used by the repo modules and tests:
//   openDatabaseAsync, execAsync, runAsync, getAllAsync, getFirstAsync,
//   withTransactionAsync.
//
// Note: `:memory:` maps directly to better-sqlite3's in-memory DB, so each
// call to openDatabaseAsync(':memory:') yields a fresh, isolated DB.

import Database from 'better-sqlite3';

class MockSQLiteDatabase {
  private db: Database.Database;

  constructor(name: string) {
    this.db = new Database(name === ':memory:' ? ':memory:' : name);
  }

  async execAsync(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async runAsync(sql: string, ...params: unknown[]): Promise<{ changes: number; lastInsertRowId: number }> {
    const flat = flattenParams(params);
    const stmt = this.db.prepare(sql);
    const info = stmt.run(...flat);
    return {
      changes: info.changes,
      lastInsertRowId: Number(info.lastInsertRowid),
    };
  }

  async getAllAsync<T = unknown>(sql: string, ...params: unknown[]): Promise<T[]> {
    const flat = flattenParams(params);
    const stmt = this.db.prepare(sql);
    return stmt.all(...flat) as T[];
  }

  async getFirstAsync<T = unknown>(sql: string, ...params: unknown[]): Promise<T | null> {
    const flat = flattenParams(params);
    const stmt = this.db.prepare(sql);
    const row = stmt.get(...flat);
    return (row ?? null) as T | null;
  }

  async withTransactionAsync(fn: () => Promise<void>): Promise<void> {
    this.db.exec('BEGIN');
    try {
      await fn();
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  async closeAsync(): Promise<void> {
    this.db.close();
  }
}

// expo-sqlite's async API accepts either positional args or a single array.
// better-sqlite3's .run/.all/.get accept positional — flatten if caller
// passed a single array (as some expo-sqlite users do).
function flattenParams(params: unknown[]): unknown[] {
  if (params.length === 1 && Array.isArray(params[0])) {
    return params[0] as unknown[];
  }
  return params;
}

export async function openDatabaseAsync(name: string): Promise<MockSQLiteDatabase> {
  return new MockSQLiteDatabase(name);
}

export type SQLiteDatabase = MockSQLiteDatabase;
