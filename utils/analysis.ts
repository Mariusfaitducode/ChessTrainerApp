import type { GameAnalysis } from "@/types/games";

/**
 * Insère les analyses dans la DB et met à jour le timestamp
 */
export const insertAnalyses = async (
  supabase: any,
  gameId: string,
  analysesToInsert: Omit<GameAnalysis, "id" | "created_at">[],
) => {
  // Log pour debug - vérifier les valeurs avant insertion
  const analysesWithMate = analysesToInsert.filter(
    (a) => a.evaluation_type === "mate" || a.mate_in !== null,
  );
  if (analysesWithMate.length > 0) {
    console.log(
      `[InsertAnalyses] ${analysesWithMate.length} analyses avec mat à insérer:`,
      analysesWithMate.map((a) => ({
        move_number: a.move_number,
        evaluation_type: a.evaluation_type,
        mate_in: a.mate_in,
      })),
    );
  }

  const { error: insertError } = await supabase
    .from("game_analyses")
    .upsert(analysesToInsert, {
      onConflict: "game_id,move_number",
    });

  if (insertError) {
    console.error("[InsertAnalyses] Erreur insertion:", insertError);
    throw insertError;
  }

  // Mettre à jour le timestamp après insertion réussie
  await supabase
    .from("games")
    .update({ analyzed_at: new Date().toISOString() })
    .eq("id", gameId);
};
