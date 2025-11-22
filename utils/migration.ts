/**
 * Migration des données guest vers Supabase
 * Appelée automatiquement lors de la création de compte
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { LocalStorage } from "./local-storage";
import type { Game, GameAnalysis, Exercise } from "@/types/database";
import type { GuestPlatform } from "@/types/guest";

/**
 * Mapping des IDs temporaires (guest) vers les IDs DB
 */
interface IdMapping {
  games: Map<string, string>; // old_game_id -> new_game_id
  analyses: Map<string, string>; // old_analysis_id -> new_analysis_id
}

/**
 * Migre toutes les données guest vers la DB Supabase
 * @param supabase Client Supabase
 * @param userId ID de l'utilisateur authentifié
 */
export async function migrateGuestDataToDB(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  console.log("[Migration] Début migration des données guest...");

  try {
    // Vérifier si la migration a déjà été effectuée
    const hasMigrated = await LocalStorage.isMigrationCompleted();
    if (hasMigrated) {
      console.log("[Migration] Migration déjà effectuée, skip");
      return;
    }

    const idMapping: IdMapping = {
      games: new Map(),
      analyses: new Map(),
    };

    // 1. Migrer les plateformes
    await migratePlatforms(supabase, userId);

    // 2. Migrer les parties (avec mapping des IDs)
    await migrateGames(supabase, userId, idMapping);

    // 3. Migrer les analyses (avec mapping des game_id)
    await migrateAnalyses(supabase, userId, idMapping);

    // 4. Migrer les exercices (avec mapping des game_id et game_analysis_id)
    await migrateExercises(supabase, userId, idMapping);

    // 5. Marquer la migration comme complétée
    await LocalStorage.setMigrationCompleted();

    // 6. Nettoyer le cache local
    await LocalStorage.clearAll();

    console.log("[Migration] Migration terminée avec succès !");
  } catch (error) {
    console.error("[Migration] Erreur lors de la migration:", error);
    throw error;
  }
}

/**
 * Migre les plateformes guest vers la DB
 */
async function migratePlatforms(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const guestPlatforms = await LocalStorage.getPlatforms();

  if (guestPlatforms.length === 0) {
    console.log("[Migration] Aucune plateforme à migrer");
    return;
  }

  console.log(`[Migration] Migration de ${guestPlatforms.length} plateforme(s)...`);

  for (const platform of guestPlatforms) {
    try {
      // Vérifier si la plateforme existe déjà
      const { data: existing, error: checkError } = await supabase
        .from("user_platforms")
        .select("*")
        .eq("user_id", userId)
        .eq("platform", platform.platform)
        .maybeSingle();

      if (checkError) {
        console.error(
          `[Migration] Erreur vérification plateforme ${platform.platform}:`,
          checkError,
        );
        continue;
      }

      if (existing) {
        // Mettre à jour si différente
        if (existing.platform_username !== platform.username) {
          const { error: updateError } = await supabase
            .from("user_platforms")
            .update({
              platform_username: platform.username,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          if (updateError) {
            console.error(
              `[Migration] Erreur mise à jour plateforme ${platform.platform}:`,
              updateError,
            );
          } else {
            console.log(
              `[Migration] Plateforme ${platform.platform} mise à jour`,
            );
          }
        }
      } else {
        // Créer
        const { error: insertError } = await supabase
          .from("user_platforms")
          .insert({
            user_id: userId,
            platform: platform.platform,
            platform_username: platform.username,
          });

        if (insertError) {
          console.error(
            `[Migration] Erreur insertion plateforme ${platform.platform}:`,
            insertError,
          );
        } else {
          console.log(`[Migration] Plateforme ${platform.platform} créée`);
        }
      }
    } catch (error) {
      console.error(
        `[Migration] Erreur lors de la migration de la plateforme ${platform.platform}:`,
        error,
      );
    }
  }
}

/**
 * Migre les parties guest vers la DB
 * Retourne un mapping des anciens IDs vers les nouveaux IDs
 */
async function migrateGames(
  supabase: SupabaseClient,
  userId: string,
  idMapping: IdMapping,
): Promise<void> {
  const guestGames = await LocalStorage.getGames();

  if (guestGames.length === 0) {
    console.log("[Migration] Aucune partie à migrer");
    return;
  }

  console.log(`[Migration] Migration de ${guestGames.length} partie(s)...`);

  // Vérifier les doublons (parties déjà existantes)
  const platformGameIds = guestGames.map((g) => ({
    platform: g.platform,
    platform_game_id: g.platform_game_id,
  }));

  // Récupérer les parties existantes pour ce user
  const { data: existingGames, error: fetchError } = await supabase
    .from("games")
    .select("id, platform, platform_game_id")
    .eq("user_id", userId);

  if (fetchError) {
    console.error("[Migration] Erreur récupération parties existantes:", fetchError);
    throw fetchError;
  }

  // Créer un Set des parties existantes (platform + platform_game_id)
  const existingSet = new Set(
    (existingGames || []).map(
      (g) => `${g.platform}_${g.platform_game_id}`,
    ),
  );

  // Filtrer les nouvelles parties
  const gamesToInsert = guestGames
    .filter(
      (g) => !existingSet.has(`${g.platform}_${g.platform_game_id}`),
    )
    .map((g) => {
      // Retirer les champs qui seront générés par la DB
      const { id, user_id, ...gameData } = g;
      return {
        ...gameData,
        user_id: userId,
      };
    });

  if (gamesToInsert.length === 0) {
    console.log("[Migration] Toutes les parties existent déjà");
    // Mapper les parties existantes
    for (const guestGame of guestGames) {
      const existing = existingGames?.find(
        (g) =>
          g.platform === guestGame.platform &&
          g.platform_game_id === guestGame.platform_game_id,
      );
      if (existing) {
        idMapping.games.set(guestGame.id, existing.id);
      }
    }
    return;
  }

  console.log(
    `[Migration] ${gamesToInsert.length} nouvelle(s) partie(s) à insérer`,
  );

  // Insérer les nouvelles parties
  const { data: insertedGames, error: insertError } = await supabase
    .from("games")
    .insert(gamesToInsert)
    .select();

  if (insertError) {
    console.error("[Migration] Erreur insertion parties:", insertError);
    throw insertError;
  }

  console.log(
    `[Migration] ${insertedGames?.length || 0} partie(s) insérée(s)`,
  );

  // Créer le mapping old_id -> new_id
  if (insertedGames) {
    for (let i = 0; i < insertedGames.length; i++) {
      const insertedGame = insertedGames[i];
      const guestGame = guestGames.find(
        (g) =>
          g.platform === insertedGame.platform &&
          g.platform_game_id === insertedGame.platform_game_id &&
          !existingSet.has(`${g.platform}_${g.platform_game_id}`),
      );
      if (guestGame) {
        idMapping.games.set(guestGame.id, insertedGame.id);
      }
    }
  }

  // Mapper aussi les parties existantes
  for (const guestGame of guestGames) {
    if (!idMapping.games.has(guestGame.id)) {
      const existing = existingGames?.find(
        (g) =>
          g.platform === guestGame.platform &&
          g.platform_game_id === guestGame.platform_game_id,
      );
      if (existing) {
        idMapping.games.set(guestGame.id, existing.id);
      }
    }
  }
}

/**
 * Migre les analyses guest vers la DB
 * Utilise le mapping des game_id pour référencer les bonnes parties
 */
async function migrateAnalyses(
  supabase: SupabaseClient,
  userId: string,
  idMapping: IdMapping,
): Promise<void> {
  const guestGames = await LocalStorage.getGames();
  let totalAnalyses = 0;

  console.log("[Migration] Migration des analyses...");

  for (const guestGame of guestGames) {
    const newGameId = idMapping.games.get(guestGame.id);

    if (!newGameId) {
      console.warn(
        `[Migration] Pas de mapping pour la partie ${guestGame.id}, skip analyses`,
      );
      continue;
    }

    const guestAnalyses = await LocalStorage.getAnalyses(guestGame.id);

    if (guestAnalyses.length === 0) {
      continue;
    }

    // Vérifier si des analyses existent déjà pour cette partie
    const { data: existingAnalyses, error: fetchError } = await supabase
      .from("game_analyses")
      .select("id, move_number")
      .eq("game_id", newGameId);

    if (fetchError) {
      console.error(
        `[Migration] Erreur récupération analyses pour partie ${newGameId}:`,
        fetchError,
      );
      continue;
    }

    const existingMoveNumbers = new Set(
      (existingAnalyses || []).map((a) => a.move_number),
    );

    // Filtrer les analyses à insérer (éviter les doublons par move_number)
    const analysesToInsert = guestAnalyses
      .filter((a) => !existingMoveNumbers.has(a.move_number))
      .map((analysis) => {
        const { id, game_id, ...analysisData } = analysis;
        return {
          ...analysisData,
          game_id: newGameId,
        };
      });

    if (analysesToInsert.length === 0) {
      console.log(
        `[Migration] Toutes les analyses existent déjà pour la partie ${newGameId}`,
      );
      // Mapper les analyses existantes
      for (const guestAnalysis of guestAnalyses) {
        const existing = existingAnalyses?.find(
          (a) => a.move_number === guestAnalysis.move_number,
        );
        if (existing) {
          idMapping.analyses.set(guestAnalysis.id, existing.id);
        }
      }
      continue;
    }

    // Insérer les nouvelles analyses
    const { data: insertedAnalyses, error: insertError } = await supabase
      .from("game_analyses")
      .insert(analysesToInsert)
      .select();

    if (insertError) {
      console.error(
        `[Migration] Erreur insertion analyses pour partie ${newGameId}:`,
        insertError,
      );
      continue;
    }

    // Créer le mapping old_analysis_id -> new_analysis_id
    if (insertedAnalyses) {
      for (let i = 0; i < insertedAnalyses.length; i++) {
        const insertedAnalysis = insertedAnalyses[i];
        const guestAnalysis = guestAnalyses.find(
          (a) =>
            a.move_number === insertedAnalysis.move_number &&
            !existingMoveNumbers.has(a.move_number),
        );
        if (guestAnalysis) {
          idMapping.analyses.set(guestAnalysis.id, insertedAnalysis.id);
        }
      }
    }

    // Mapper aussi les analyses existantes
    for (const guestAnalysis of guestAnalyses) {
      if (!idMapping.analyses.has(guestAnalysis.id)) {
        const existing = existingAnalyses?.find(
          (a) => a.move_number === guestAnalysis.move_number,
        );
        if (existing) {
          idMapping.analyses.set(guestAnalysis.id, existing.id);
        }
      }
    }

    totalAnalyses += analysesToInsert.length;
    console.log(
      `[Migration] ${analysesToInsert.length} analyse(s) migrée(s) pour la partie ${newGameId}`,
    );
  }

  console.log(`[Migration] Total: ${totalAnalyses} analyse(s) migrée(s)`);
}

/**
 * Migre les exercices guest vers la DB
 * Utilise le mapping des game_id et game_analysis_id
 */
async function migrateExercises(
  supabase: SupabaseClient,
  userId: string,
  idMapping: IdMapping,
): Promise<void> {
  const guestExercises = await LocalStorage.getExercises();

  if (guestExercises.length === 0) {
    console.log("[Migration] Aucun exercice à migrer");
    return;
  }

  console.log(`[Migration] Migration de ${guestExercises.length} exercice(s)...`);

  const exercisesToInsert: Omit<Exercise, "id" | "created_at">[] = [];

  for (const guestExercise of guestExercises) {
    // Mapper game_id
    const newGameId = guestExercise.game_id
      ? idMapping.games.get(guestExercise.game_id)
      : null;

    // Mapper game_analysis_id
    const newAnalysisId = guestExercise.game_analysis_id
      ? idMapping.analyses.get(guestExercise.game_analysis_id)
      : null;

    if (guestExercise.game_id && !newGameId) {
      console.warn(
        `[Migration] Pas de mapping pour game_id ${guestExercise.game_id}, skip exercice ${guestExercise.id}`,
      );
      continue;
    }

    if (guestExercise.game_analysis_id && !newAnalysisId) {
      console.warn(
        `[Migration] Pas de mapping pour game_analysis_id ${guestExercise.game_analysis_id}, skip exercice ${guestExercise.id}`,
      );
      continue;
    }

    // Vérifier si l'exercice existe déjà (par FEN et correct_move)
    if (newGameId && guestExercise.fen && guestExercise.correct_move) {
      const { data: existing, error: checkError } = await supabase
        .from("exercises")
        .select("id")
        .eq("user_id", userId)
        .eq("game_id", newGameId)
        .eq("fen", guestExercise.fen)
        .eq("correct_move", guestExercise.correct_move)
        .maybeSingle();

      if (checkError) {
        console.error(
          `[Migration] Erreur vérification exercice ${guestExercise.id}:`,
          checkError,
        );
        continue;
      }

      if (existing) {
        console.log(
          `[Migration] Exercice déjà existant (FEN: ${guestExercise.fen}), skip`,
        );
        continue;
      }
    }

    // Préparer l'exercice pour insertion
    const { id, user_id, ...exerciseData } = guestExercise;
    exercisesToInsert.push({
      ...exerciseData,
      user_id: userId,
      game_id: newGameId || null,
      game_analysis_id: newAnalysisId || null,
    });
  }

  if (exercisesToInsert.length === 0) {
    console.log("[Migration] Tous les exercices existent déjà");
    return;
  }

  console.log(
    `[Migration] ${exercisesToInsert.length} exercice(s) à insérer`,
  );

  // Insérer les exercices
  const { error: insertError } = await supabase
    .from("exercises")
    .insert(exercisesToInsert);

  if (insertError) {
    console.error("[Migration] Erreur insertion exercices:", insertError);
    throw insertError;
  }

  console.log(
    `[Migration] ${exercisesToInsert.length} exercice(s) migré(s)`,
  );
}

