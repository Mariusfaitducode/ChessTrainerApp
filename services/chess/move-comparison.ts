// Utilitaires pour comparer des coups d'échecs de manière robuste
// NOTE: Maintenant que nous stockons en UCI, la plupart des comparaisons peuvent être directes
import { Chess } from "chess.js";

/**
 * Compare deux coups UCI (comparaison directe, très rapide)
 * @param move1Uci Premier coup en UCI
 * @param move2Uci Deuxième coup en UCI
 * @returns true si les coups sont identiques
 */
export function areUciMovesEqual(
  move1Uci: string | null,
  move2Uci: string | null,
): boolean {
  if (!move1Uci || !move2Uci) return false;
  return move1Uci.toLowerCase() === move2Uci.toLowerCase();
}

/**
 * Compare deux coups d'échecs en les jouant dans une position
 * Utile pour comparer des formats différents (SAN vs UCI) ou pour compatibilité
 * Retourne true si les coups sont identiques (même from, to, promotion)
 */
export function areMovesEqual(
  move1: string,
  move2: string,
  fen: string,
): boolean {
  try {
    const game1 = new Chess(fen);
    const game2 = new Chess(fen);

    // Essayer de jouer les deux coups
    const played1 = game1.move(move1);
    const played2 = game2.move(move2);

    // Si l'un des deux échoue, les coups ne sont pas égaux
    if (!played1 || !played2) {
      return false;
    }

    // Comparer les propriétés essentielles du coup
    return (
      played1.from === played2.from &&
      played1.to === played2.to &&
      (played1.promotion || "") === (played2.promotion || "")
    );
  } catch {
    // Si une erreur survient, retourner false
    return false;
  }
}

/**
 * Normalise un coup en retirant les annotations
 * Ex: "Nf3+" -> "Nf3", "b8=Q#" -> "b8=Q"
 * NOTE: Pour UCI, cette fonction n'est plus vraiment nécessaire
 */
export function normalizeMove(move: string): string {
  return move
    .replace(/[+#=!?]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Compare deux coups avec plusieurs méthodes pour plus de robustesse
 * 1. Comparaison directe normalisée (rapide)
 * 2. Comparaison en jouant les coups dans chess.js (précise)
 *
 * NOTE: Si les deux coups sont en UCI, utilisez areUciMovesEqual() à la place (plus rapide)
 */
export function compareMoves(
  move1: string,
  move2: string,
  fen: string,
): boolean {
  // Méthode 1: Comparaison rapide normalisée
  const normalized1 = normalizeMove(move1);
  const normalized2 = normalizeMove(move2);

  if (normalized1 === normalized2) {
    return true;
  }

  // Méthode 2: Comparaison précise en jouant les coups
  // (nécessaire car les formats peuvent différer: SAN vs UCI)
  return areMovesEqual(move1, move2, fen);
}
