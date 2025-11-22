/**
 * Gestion du stockage local pour le mode guest
 * Utilise AsyncStorage pour persister les données sans compte
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Game, GameAnalysis, Exercise } from "@/types/database";
import type { GuestPlatform, GUEST_STORAGE_KEYS } from "@/types/guest";

const STORAGE_KEYS = {
  GAMES: "guest_games",
  PLATFORMS: "guest_platforms",
  EXERCISES: "guest_exercises",
  ANALYSES_PREFIX: "guest_analyses_",
  MIGRATION_FLAG: "guest_migration_completed",
} as const;

/**
 * Gestionnaire du stockage local pour le mode guest
 */
export const LocalStorage = {
  /**
   * Sauvegarder toutes les parties
   */
  async saveGames(games: Game[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(games));
    } catch (error) {
      console.error("[LocalStorage] Erreur sauvegarde parties:", error);
      throw error;
    }
  },

  /**
   * Récupérer toutes les parties
   */
  async getGames(): Promise<Game[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.GAMES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("[LocalStorage] Erreur récupération parties:", error);
      return [];
    }
  },

  /**
   * Ajouter une partie
   */
  async addGame(game: Game): Promise<void> {
    const games = await this.getGames();
    // Vérifier les doublons basés sur platform + platform_game_id
    const exists = games.some(
      (g) =>
        g.platform === game.platform &&
        g.platform_game_id === game.platform_game_id
    );
    if (!exists) {
      games.push(game);
      await this.saveGames(games);
    }
  },

  /**
   * Supprimer une partie
   */
  async removeGame(gameId: string): Promise<void> {
    const games = await this.getGames();
    const filtered = games.filter((g) => g.id !== gameId);
    await this.saveGames(filtered);
  },

  /**
   * Sauvegarder les plateformes
   */
  async savePlatforms(platforms: GuestPlatform[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.PLATFORMS,
        JSON.stringify(platforms)
      );
    } catch (error) {
      console.error("[LocalStorage] Erreur sauvegarde plateformes:", error);
      throw error;
    }
  },

  /**
   * Récupérer les plateformes
   */
  async getPlatforms(): Promise<GuestPlatform[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PLATFORMS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("[LocalStorage] Erreur récupération plateformes:", error);
      return [];
    }
  },

  /**
   * Ajouter ou mettre à jour une plateforme
   */
  async addPlatform(platform: GuestPlatform["platform"], username: string): Promise<void> {
    const platforms = await this.getPlatforms();
    const existingIndex = platforms.findIndex((p) => p.platform === platform);
    
    if (existingIndex !== -1) {
      platforms[existingIndex].username = username;
    } else {
      platforms.push({ platform, username });
    }
    
    await this.savePlatforms(platforms);
  },

  /**
   * Supprimer une plateforme
   */
  async removePlatform(platform: GuestPlatform["platform"]): Promise<void> {
    const platforms = await this.getPlatforms();
    const filtered = platforms.filter((p) => p.platform !== platform);
    await this.savePlatforms(filtered);
  },

  /**
   * Sauvegarder les analyses d'une partie
   */
  async saveAnalyses(gameId: string, analyses: GameAnalysis[]): Promise<void> {
    try {
      const key = `${STORAGE_KEYS.ANALYSES_PREFIX}${gameId}`;
      await AsyncStorage.setItem(key, JSON.stringify(analyses));
    } catch (error) {
      console.error("[LocalStorage] Erreur sauvegarde analyses:", error);
      throw error;
    }
  },

  /**
   * Récupérer les analyses d'une partie
   */
  async getAnalyses(gameId: string): Promise<GameAnalysis[]> {
    try {
      const key = `${STORAGE_KEYS.ANALYSES_PREFIX}${gameId}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("[LocalStorage] Erreur récupération analyses:", error);
      return [];
    }
  },

  /**
   * Récupérer toutes les analyses (pour migration)
   */
  async getAllAnalyses(): Promise<Record<string, GameAnalysis[]>> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const analysisKeys = keys.filter((key) =>
        key.startsWith(STORAGE_KEYS.ANALYSES_PREFIX)
      );

      const allAnalyses: Record<string, GameAnalysis[]> = {};
      for (const key of analysisKeys) {
        const gameId = key.replace(STORAGE_KEYS.ANALYSES_PREFIX, "");
        const analyses = await this.getAnalyses(gameId);
        if (analyses.length > 0) {
          allAnalyses[gameId] = analyses;
        }
      }

      return allAnalyses;
    } catch (error) {
      console.error("[LocalStorage] Erreur récupération toutes analyses:", error);
      return {};
    }
  },

  /**
   * Sauvegarder tous les exercices
   */
  async saveExercises(exercises: Exercise[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.EXERCISES,
        JSON.stringify(exercises)
      );
    } catch (error) {
      console.error("[LocalStorage] Erreur sauvegarde exercices:", error);
      throw error;
    }
  },

  /**
   * Récupérer tous les exercices
   */
  async getExercises(): Promise<Exercise[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.EXERCISES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("[LocalStorage] Erreur récupération exercices:", error);
      return [];
    }
  },

  /**
   * Ajouter un exercice
   */
  async addExercise(exercise: Exercise): Promise<void> {
    const exercises = await this.getExercises();
    // Vérifier les doublons basés sur game_analysis_id
    const exists = exercises.some(
      (e) => e.game_analysis_id === exercise.game_analysis_id
    );
    if (!exists) {
      exercises.push(exercise);
      await this.saveExercises(exercises);
    }
  },

  /**
   * Mettre à jour un exercice
   */
  async updateExercise(
    exerciseId: string,
    updates: Partial<Exercise>
  ): Promise<void> {
    const exercises = await this.getExercises();
    const index = exercises.findIndex((e) => e.id === exerciseId);
    if (index !== -1) {
      exercises[index] = { ...exercises[index], ...updates };
      await this.saveExercises(exercises);
    }
  },

  /**
   * Marquer la migration comme complétée
   */
  async setMigrationCompleted(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MIGRATION_FLAG, "true");
    } catch (error) {
      console.error("[LocalStorage] Erreur marquage migration:", error);
    }
  },

  /**
   * Vérifier si la migration a été complétée
   */
  async isMigrationCompleted(): Promise<boolean> {
    try {
      const flag = await AsyncStorage.getItem(STORAGE_KEYS.MIGRATION_FLAG);
      return flag === "true";
    } catch (error) {
      console.error("[LocalStorage] Erreur vérification migration:", error);
      return false;
    }
  },

  /**
   * Nettoyer toutes les données guest
   */
  async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const guestKeys = keys.filter((key) =>
        Object.values(STORAGE_KEYS).some((storageKey) =>
          typeof storageKey === "string"
            ? key === storageKey || key.startsWith(storageKey)
            : false
        )
      );
      await AsyncStorage.multiRemove(guestKeys);
    } catch (error) {
      console.error("[LocalStorage] Erreur nettoyage:", error);
    }
  },

  /**
   * Obtenir la taille approximative des données stockées (pour monitoring)
   */
  async getStorageSize(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const guestKeys = keys.filter((key) =>
        Object.values(STORAGE_KEYS).some((storageKey) =>
          typeof storageKey === "string"
            ? key === storageKey || key.startsWith(storageKey)
            : false
        )
      );

      let totalSize = 0;
      for (const key of guestKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }

      return totalSize; // Taille en caractères (approximatif)
    } catch (error) {
      console.error("[LocalStorage] Erreur calcul taille:", error);
      return 0;
    }
  },
};

