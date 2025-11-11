/**
 * Utilitaires pour obtenir les badges de classification des coups d'échecs
 */

/**
 * Retourne l'image du badge selon la qualité du coup (move_quality)
 * @param quality Qualité du coup : "best", "excellent", "good", "inaccuracy", "mistake", "blunder", etc.
 * @returns Require de l'image du badge ou null si non trouvé
 */
export const getQualityBadgeImage = (
  quality: string | null | undefined,
): any => {
  switch (quality) {
    case "best":
      return require("@/assets/chess-badges/best.png");
    case "excellent":
      return require("@/assets/chess-badges/very_good.png");
    case "good":
      return require("@/assets/chess-badges/good.png");
    case "inaccuracy":
      return require("@/assets/chess-badges/imprecise.png");
    case "mistake":
      return require("@/assets/chess-badges/mistake.png");
    case "blunder":
      return require("@/assets/chess-badges/blunder.png");
    case "brilliant":
      return require("@/assets/chess-badges/brilliant.png");
    case "ok":
      return require("@/assets/chess-badges/ok.png");
    case "theory":
      return require("@/assets/chess-badges/theory.png");
    case "miss":
      return require("@/assets/chess-badges/miss.png");
    default:
      return null;
  }
};

