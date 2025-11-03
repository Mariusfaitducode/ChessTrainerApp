import type { GameAnalysis } from "@/types/games";

/**
 * Insère les analyses dans la DB et met à jour le timestamp
 */
export const insertAnalyses = async (
  supabase: any,
  gameId: string,
  analysesToInsert: Omit<GameAnalysis, "id" | "created_at">[],
) => {
  const { error: insertError } = await supabase
    .from("game_analyses")
    .upsert(analysesToInsert, {
      onConflict: "game_id,move_number",
    });

  if (insertError) {
    throw insertError;
  }

  // Mettre à jour le timestamp après insertion réussie
  await supabase
    .from("games")
    .update({ analyzed_at: new Date().toISOString() })
    .eq("id", gameId);
};
