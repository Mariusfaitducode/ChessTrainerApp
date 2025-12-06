import type { Exercise } from "@/types/exercises";
import type { Game } from "@/types/games";

// Interface pour les éléments plats de la liste
export type MapItemType = "game_header" | "exercise" | "start_point";

export interface MapItem {
  id: string;
  type: MapItemType;
  index: number;
  data?: {
    game?: Game;
    exercise?: Exercise;
    result?: "win" | "loss" | "draw" | null;
    opponentName?: string;
    opponentElo?: number | null;
    userColor?: "white" | "black" | null;
    gameType?: string; // e.g. "Blitz", "Rapid"
    accuracy?: number; // e.g. 85.5
  };
}



