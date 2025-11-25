// Types pour la classification des coups d'échecs
// NOTE: La classification est maintenant gérée entièrement par le backend
// Ce fichier ne contient que les types TypeScript pour le frontend

export type MoveQuality =
  | "best" // Meilleur coup (joué = best_move) ou perte < 50 cp
  | "excellent" // Coup excellent (perte 50-100 centipawns)
  | "good" // Bon coup (perte 100-200 centipawns)
  | "inaccuracy" // Imprécision (perte 200-300 centipawns)
  | "mistake" // Erreur (perte 300-500 centipawns)
  | "blunder" // Erreur grave (perte > 500 centipawns)
  | "miss"; // Opportunité manquée (pas de perte mais meilleur coup disponible)

export type GamePhase = "opening" | "middlegame" | "endgame";

export interface MoveClassification {
  move_quality: MoveQuality;
  game_phase: GamePhase;
  evaluation_loss: number; // Perte d'évaluation en centipawns (0 si meilleur coup)
}
