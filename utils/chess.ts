import type { GameResult } from "@/types/chess";

export const getResultLabel = (result: GameResult | null): string => {
  switch (result) {
    case "1-0":
      return "Blancs gagnent";
    case "0-1":
      return "Noirs gagnent";
    case "1/2-1/2":
      return "Match nul";
    case "*":
      return "En cours";
    default:
      return "Résultat inconnu";
  }
};

export const formatTimeControl = (timeControl: string | null): string => {
  if (!timeControl) return "Temps non spécifié";

  // Format Lichess: "300+0" (5 min)
  // Format Chess.com: "600" (10 min)
  if (timeControl.includes("+")) {
    const [seconds, increment] = timeControl.split("+");
    const minutes = Math.floor(parseInt(seconds) / 60);
    const inc = parseInt(increment);
    if (inc > 0) {
      return `${minutes}min + ${inc}s`;
    }
    return `${minutes}min`;
  }

  const seconds = parseInt(timeControl);
  if (!isNaN(seconds)) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}min`;
  }

  return timeControl;
};
