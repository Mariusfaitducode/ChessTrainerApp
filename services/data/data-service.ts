/**
 * Service de données unifié
 * Abstraction qui cache la différence entre mode guest (LocalStorage) et authentifié (Supabase)
 * Les hooks utilisent cette abstraction au lieu de gérer directement les conditions
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { LocalStorage } from "@/utils/local-storage";
import { generateUUIDSync } from "@/utils/uuid";
import type {
  Game,
  GameAnalysis,
  Exercise,
  UserPlatform,
} from "@/types/database";

export interface DataService {
  // Games
  getGames(): Promise<Game[]>;
  getGame(gameId: string): Promise<Game | null>;
  getGamePGN(gameId: string): Promise<string | null>;
  addGame(
    game: Omit<Game, "id" | "imported_at" | "analyzed_at">,
  ): Promise<Game>;
  updateGame(gameId: string, updates: Partial<Game>): Promise<void>;

  // Analyses
  getAnalyses(gameId: string): Promise<GameAnalysis[]>;
  saveAnalyses(
    gameId: string,
    analyses: Omit<GameAnalysis, "id" | "created_at">[],
  ): Promise<void>;
  updateGameAnalyzedAt(
    gameId: string,
    analyzedAt: string | null,
  ): Promise<void>;

  // Exercises
  getExercises(completed?: boolean): Promise<Exercise[]>;
  getExercise(exerciseId: string): Promise<Exercise | null>;
  addExercise(exercise: Omit<Exercise, "id" | "created_at">): Promise<Exercise>;
  updateExercise(exerciseId: string, updates: Partial<Exercise>): Promise<void>;

  // Platforms
  getPlatforms(): Promise<UserPlatform[]>;
  addPlatform(
    platform: UserPlatform["platform"],
    username: string,
  ): Promise<UserPlatform>;
  removePlatform(platformId: string): Promise<void>;
}

/**
 * Crée un service de données selon le mode (guest ou authentifié)
 */
export function createDataService(
  supabase: SupabaseClient | null,
  session: { user: { id: string } } | null,
  isGuest: boolean,
): DataService {
  if (isGuest || !session) {
    return createGuestDataService();
  }

  return createAuthenticatedDataService(supabase!, session.user.id);
}

/**
 * Service de données pour le mode guest (LocalStorage)
 */
function createGuestDataService(): DataService {
  return {
    // Games
    async getGames(): Promise<Game[]> {
      const games = await LocalStorage.getGames();

      // Récupérer toutes les analyses pour calculer analyzed_at et blunders_count
      const allAnalysesMap = new Map<string, GameAnalysis[]>();
      for (const game of games) {
        const analyses = await LocalStorage.getAnalyses(game.id);
        if (analyses.length > 0) {
          allAnalysesMap.set(game.id, analyses);
        }
      }

      // Enrichir les parties avec analyzed_at et blunders_count
      return games.map((game) => {
        const analyses = allAnalysesMap.get(game.id) || [];
        const hasAnalyses = analyses.length > 0;
        const blundersCount = analyses.filter(
          (a) => a.move_quality === "blunder",
        ).length;

        return {
          ...game,
          analyzed_at: hasAnalyses
            ? game.analyzed_at || new Date().toISOString()
            : null,
          blunders_count: blundersCount,
        } as Game;
      });
    },

    async getGame(gameId: string): Promise<Game | null> {
      const games = await LocalStorage.getGames();
      const game = games.find((g) => g.id === gameId);
      if (!game) return null;

      // Récupérer les analyses pour calculer blunders_count
      const analyses = await LocalStorage.getAnalyses(gameId);
      const blundersCount = analyses.filter(
        (a) => a.move_quality === "blunder",
      ).length;

      return {
        ...game,
        blunders_count: blundersCount,
        analyzed_at:
          analyses.length > 0
            ? game.analyzed_at || new Date().toISOString()
            : null,
      } as Game;
    },

    async getGamePGN(gameId: string): Promise<string | null> {
      const games = await LocalStorage.getGames();
      const game = games.find((g) => g.id === gameId);
      return game?.pgn || null;
    },

    async addGame(
      game: Omit<Game, "id" | "imported_at" | "analyzed_at">,
    ): Promise<Game> {
      const gameWithId: Game = {
        ...game,
        id: generateUUIDSync(),
        imported_at: new Date().toISOString(),
        analyzed_at: null,
      } as Game;

      await LocalStorage.addGame(gameWithId);
      return gameWithId;
    },

    async updateGame(gameId: string, updates: Partial<Game>): Promise<void> {
      const games = await LocalStorage.getGames();
      const gameIndex = games.findIndex((g) => g.id === gameId);
      if (gameIndex !== -1) {
        games[gameIndex] = { ...games[gameIndex], ...updates };
        await LocalStorage.saveGames(games);
      }
    },

    // Analyses
    async getAnalyses(gameId: string): Promise<GameAnalysis[]> {
      return await LocalStorage.getAnalyses(gameId);
    },

    async saveAnalyses(
      gameId: string,
      analyses: Omit<GameAnalysis, "id" | "created_at">[],
    ): Promise<void> {
      // Ajouter les champs manquants pour correspondre à la structure Supabase
      const analysesWithIds: GameAnalysis[] = analyses.map((analysis) => ({
        ...analysis,
        id: generateUUIDSync(),
        created_at: new Date().toISOString(),
        game_id: gameId,
        evaluation: analysis.evaluation ?? null,
        best_move: analysis.best_move ?? null,
        played_move: analysis.played_move,
        move_quality: analysis.move_quality ?? null,
        game_phase: analysis.game_phase ?? null,
        evaluation_loss: analysis.evaluation_loss ?? null,
        evaluation_type: analysis.evaluation_type ?? null,
        mate_in: analysis.mate_in ?? null,
        analysis_data: null,
      })) as GameAnalysis[];

      await LocalStorage.saveAnalyses(gameId, analysesWithIds);
    },

    async updateGameAnalyzedAt(
      gameId: string,
      analyzedAt: string | null,
    ): Promise<void> {
      const games = await LocalStorage.getGames();
      const gameIndex = games.findIndex((g) => g.id === gameId);
      if (gameIndex !== -1) {
        games[gameIndex].analyzed_at = analyzedAt;
        await LocalStorage.saveGames(games);
      }
    },

    // Exercises
    async getExercises(completed?: boolean): Promise<Exercise[]> {
      let exercises = await LocalStorage.getExercises();

      if (completed !== undefined) {
        exercises = exercises.filter((e) => e.completed === completed);
      }

      // Retourner les exercices bruts (l'enrichissement se fait dans useExercises)
      return exercises;
    },

    async getExercise(exerciseId: string): Promise<Exercise | null> {
      const exercises = await LocalStorage.getExercises();
      const exercise = exercises.find((e) => e.id === exerciseId);
      return exercise || null;
    },

    async addExercise(
      exercise: Omit<Exercise, "id" | "created_at">,
    ): Promise<Exercise> {
      const exerciseWithId: Exercise = {
        ...exercise,
        id: generateUUIDSync(),
        created_at: new Date().toISOString(),
      } as Exercise;

      await LocalStorage.addExercise(exerciseWithId);
      return exerciseWithId;
    },

    async updateExercise(
      exerciseId: string,
      updates: Partial<Exercise>,
    ): Promise<void> {
      await LocalStorage.updateExercise(exerciseId, updates);
    },

    // Platforms
    async getPlatforms(): Promise<UserPlatform[]> {
      const guestPlatforms = await LocalStorage.getPlatforms();
      return guestPlatforms.map((p) => ({
        id: `guest_${p.platform}`,
        user_id: "guest",
        platform: p.platform,
        platform_username: p.username,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_sync_at: null,
      })) as UserPlatform[];
    },

    async addPlatform(
      platform: UserPlatform["platform"],
      username: string,
    ): Promise<UserPlatform> {
      await LocalStorage.addPlatform(platform, username);
      return {
        id: `guest_${platform}`,
        user_id: "guest",
        platform,
        platform_username: username,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_sync_at: null,
      } as UserPlatform;
    },

    async removePlatform(platformId: string): Promise<void> {
      const platform = platformId.replace(
        "guest_",
        "",
      ) as UserPlatform["platform"];
      await LocalStorage.removePlatform(platform);
    },
  };
}

/**
 * Service de données pour le mode authentifié (Supabase)
 */
function createAuthenticatedDataService(
  supabase: SupabaseClient,
  userId: string,
): DataService {
  return {
    // Games
    async getGames(): Promise<Game[]> {
      const { data: gamesData, error } = await supabase
        .from("games")
        .select("*")
        .eq("user_id", userId)
        .order("played_at", { ascending: false });

      if (error) throw error;
      if (!gamesData || gamesData.length === 0) return [];

      // Récupérer les analyses pour calculer analyzed_at et blunders_count
      const gameIds = gamesData.map((g) => g.id);
      const { data: analysesData } = await supabase
        .from("game_analyses")
        .select("game_id, move_quality")
        .in("game_id", gameIds);

      const gamesWithAnalyses = new Set(
        (analysesData || []).map((a) => a.game_id),
      );

      const blundersCountByGame = new Map<string, number>();
      (analysesData || []).forEach((analysis) => {
        if (analysis.move_quality === "blunder") {
          const current = blundersCountByGame.get(analysis.game_id) || 0;
          blundersCountByGame.set(analysis.game_id, current + 1);
        }
      });

      return gamesData.map((game) => {
        const hasAnalyses = gamesWithAnalyses.has(game.id);
        const blundersCount = blundersCountByGame.get(game.id) || 0;

        return {
          ...game,
          analyzed_at: hasAnalyses
            ? game.analyzed_at || new Date().toISOString()
            : null,
          blunders_count: blundersCount,
        } as Game;
      });
    },

    async getGame(gameId: string): Promise<Game | null> {
      const { data, error } = await supabase
        .from("games")
        .select(
          "id, platform, platform_game_id, white_player, black_player, result, time_control, played_at, analyzed_at",
        )
        .eq("id", gameId)
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      return data as Game | null;
    },

    async getGamePGN(gameId: string): Promise<string | null> {
      const { data, error } = await supabase
        .from("games")
        .select("pgn")
        .eq("id", gameId)
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      return data?.pgn || null;
    },

    async addGame(
      game: Omit<Game, "id" | "imported_at" | "analyzed_at">,
    ): Promise<Game> {
      const { data, error } = await supabase
        .from("games")
        .insert({
          ...game,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Game;
    },

    async updateGame(gameId: string, updates: Partial<Game>): Promise<void> {
      const { error } = await supabase
        .from("games")
        .update(updates)
        .eq("id", gameId)
        .eq("user_id", userId);

      if (error) throw error;
    },

    // Analyses
    async getAnalyses(gameId: string): Promise<GameAnalysis[]> {
      const { data, error } = await supabase
        .from("game_analyses")
        .select(
          "id, game_id, move_number, evaluation, best_move, move_quality, game_phase, evaluation_loss, evaluation_type, mate_in",
        )
        .eq("game_id", gameId)
        .order("move_number", { ascending: true });

      if (error) throw error;
      return (data as GameAnalysis[]) || [];
    },

    async saveAnalyses(
      gameId: string,
      analyses: Omit<GameAnalysis, "id" | "created_at">[],
    ): Promise<void> {
      const { error } = await supabase.from("game_analyses").upsert(
        analyses.map((a) => ({ ...a, game_id: gameId })),
        {
          onConflict: "game_id,move_number",
        },
      );

      if (error) throw error;

      // Mettre à jour analyzed_at
      await supabase
        .from("games")
        .update({ analyzed_at: new Date().toISOString() })
        .eq("id", gameId);
    },

    async updateGameAnalyzedAt(
      gameId: string,
      analyzedAt: string | null,
    ): Promise<void> {
      const { error } = await supabase
        .from("games")
        .update({ analyzed_at: analyzedAt })
        .eq("id", gameId)
        .eq("user_id", userId);

      if (error) throw error;
    },

    // Exercises
    async getExercises(completed?: boolean): Promise<Exercise[]> {
      let query = supabase
        .from("exercises")
        .select(
          `
          *,
          games (*),
          game_analyses!exercises_game_analysis_id_fkey (*)
        `,
        )
        .eq("user_id", userId);

      if (completed !== undefined) {
        query = query.eq("completed", completed);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Récupérer toutes les analyses pour l'enrichissement
      const gameIds = data
        .map((ex) => ex.game_id)
        .filter((id): id is string => !!id);

      let allAnalyses: GameAnalysis[] = [];
      if (gameIds.length > 0) {
        const { data: analysesData, error: analysesError } = await supabase
          .from("game_analyses")
          .select("*")
          .in("game_id", gameIds)
          .order("game_id, move_number", { ascending: true });

        if (analysesError) throw analysesError;
        allAnalyses = (analysesData as GameAnalysis[]) || [];
      }

      const analysesByGameAndMove = new Map<
        string,
        Map<number, GameAnalysis>
      >();
      allAnalyses.forEach((analysis) => {
        if (!analysesByGameAndMove.has(analysis.game_id)) {
          analysesByGameAndMove.set(analysis.game_id, new Map());
        }
        analysesByGameAndMove
          .get(analysis.game_id)!
          .set(analysis.move_number, analysis);
      });

      // Retourner les exercices avec game et analysis attachés (l'enrichissement se fait dans useExercises)
      return data.map((exercise) => ({
        ...exercise,
        // game et analysis sont déjà attachés via les JOINs Supabase
      })) as Exercise[];
    },

    async getExercise(exerciseId: string): Promise<Exercise | null> {
      const { data, error } = await supabase
        .from("exercises")
        .select(
          `
          *,
          games (*),
          game_analyses!exercises_game_analysis_id_fkey (*)
        `,
        )
        .eq("id", exerciseId)
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      if (!data) return null;

      // Retourner l'exercice avec game et analysis attachés (l'enrichissement se fait dans useExercise)
      return {
        ...data,
        // game et analysis sont déjà attachés via les JOINs Supabase
      } as Exercise;
    },

    async addExercise(
      exercise: Omit<Exercise, "id" | "created_at">,
    ): Promise<Exercise> {
      const { data, error } = await supabase
        .from("exercises")
        .insert({
          ...exercise,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Exercise;
    },

    async updateExercise(
      exerciseId: string,
      updates: Partial<Exercise>,
    ): Promise<void> {
      const { error } = await supabase
        .from("exercises")
        .update(updates)
        .eq("id", exerciseId)
        .eq("user_id", userId);

      if (error) throw error;
    },

    // Platforms
    async getPlatforms(): Promise<UserPlatform[]> {
      const { data, error } = await supabase
        .from("user_platforms")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as UserPlatform[]) || [];
    },

    async addPlatform(
      platform: UserPlatform["platform"],
      username: string,
    ): Promise<UserPlatform> {
      // Vérifier si existe déjà
      const { data: existing } = await supabase
        .from("user_platforms")
        .select("*")
        .eq("user_id", userId)
        .eq("platform", platform)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("user_platforms")
          .update({
            platform_username: username,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data as UserPlatform;
      }

      const { data, error } = await supabase
        .from("user_platforms")
        .insert({
          user_id: userId,
          platform,
          platform_username: username,
        })
        .select()
        .single();

      if (error) throw error;
      return data as UserPlatform;
    },

    async removePlatform(platformId: string): Promise<void> {
      const { error } = await supabase
        .from("user_platforms")
        .delete()
        .eq("id", platformId)
        .eq("user_id", userId);

      if (error) throw error;
    },
  };
}
