import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';

interface AppState {
  username: string | null;
  isSyncing: boolean;
  syncProgress: { current: number; total: number } | null;

  loadFromDb: (db: SQLiteDatabase) => Promise<void>;
  setUsername: (db: SQLiteDatabase, username: string) => Promise<void>;
  clearUsername: (db: SQLiteDatabase) => Promise<void>;
  setSyncing: (syncing: boolean) => void;
  setSyncProgress: (progress: { current: number; total: number } | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  username: null,
  isSyncing: false,
  syncProgress: null,

  loadFromDb: async (db) => {
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM app_state WHERE key = 'username'",
    );
    set({ username: row?.value ?? null });
  },

  setUsername: async (db, username) => {
    await db.runAsync(
      `INSERT INTO app_state (key, value) VALUES ('username', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      username,
    );
    set({ username });
  },

  clearUsername: async (db) => {
    await db.runAsync("DELETE FROM app_state WHERE key = 'username'");
    set({ username: null });
  },

  setSyncing: (isSyncing) => set({ isSyncing }),
  setSyncProgress: (syncProgress) => set({ syncProgress }),
}));
