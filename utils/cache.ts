import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_PREFIX = "chess_game_cache:";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 heures

interface CacheData<T> {
  data: T;
  timestamp: number;
}

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!cached) return null;

      const parsed: CacheData<T> = JSON.parse(cached);
      const age = Date.now() - parsed.timestamp;

      if (age > CACHE_TTL) {
        // Cache expiré, supprimer
        await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.error(`[Cache] Erreur lors de la lecture de ${key}:`, error);
      return null;
    }
  },

  async set<T>(key: string, data: T): Promise<void> {
    try {
      const cacheData: CacheData<T> = {
        data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(
        `${CACHE_PREFIX}${key}`,
        JSON.stringify(cacheData),
      );
    } catch (error) {
      console.error(`[Cache] Erreur lors de l'écriture de ${key}:`, error);
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
    } catch (error) {
      console.error(`[Cache] Erreur lors de la suppression de ${key}:`, error);
    }
  },

  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error("[Cache] Erreur lors du nettoyage:", error);
    }
  },
};
