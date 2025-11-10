/**
 * Utilitaires pour convertir entre formats de coups d'échecs
 * UCI (Universal Chess Interface) : format standard pour stockage
 * SAN (Standard Algebraic Notation) : format lisible pour affichage
 */
import { Chess } from "chess.js";

/**
 * Convertit les coups UCI dans un texte en SAN pour affichage
 * Ex: "Position après le coup 5 (blancs). Vous avez fait l'erreur : e2e4"
 *     -> "Position après le coup 5 (blancs). Vous avez fait l'erreur : e4"
 * @param text Texte contenant potentiellement des coups UCI
 * @param fen FEN de la position (pour conversion)
 * @returns Texte avec coups convertis en SAN
 */
export function convertUciToSanInText(text: string, fen: string): string {
  // Pattern pour détecter les coups UCI (ex: "e2e4", "g1f3", "e7e8q")
  const uciPattern = /\b([a-h][1-8][a-h][1-8][qrbn]?)\b/gi;

  return text.replace(uciPattern, (match) => {
    const san = uciToSan(match, fen);
    return san || match; // Fallback sur UCI si conversion échoue
  });
}

/**
 * Convertit un coup UCI en SAN pour affichage
 * @param moveUci Coup en format UCI (ex: "e2e4", "g1f3", "e7e8q")
 * @param fen FEN de la position avant le coup
 * @returns Coup en format SAN (ex: "e4", "Nf3", "e8=Q") ou null si échec
 */
export function uciToSan(moveUci: string | null, fen: string): string | null {
  if (!moveUci) return null;

  try {
    const game = new Chess(fen);
    const moveObj = game.move(moveUci);
    if (moveObj?.san) {
      return moveObj.san;
    }
  } catch {
    // Si la conversion échoue, retourner null
  }

  return null;
}

/**
 * Convertit un coup SAN en UCI
 * @param moveSan Coup en format SAN (ex: "e4", "Nf3", "e8=Q")
 * @param fen FEN de la position avant le coup
 * @returns Coup en format UCI (ex: "e2e4", "g1f3", "e7e8q") ou null si échec
 */
export function sanToUci(moveSan: string | null, fen: string): string | null {
  if (!moveSan) return null;

  try {
    const game = new Chess(fen);
    const moveObj = game.move(moveSan);
    if (moveObj) {
      return moveObj.from + moveObj.to + (moveObj.promotion || "");
    }
  } catch {
    // Si la conversion échoue, retourner null
  }

  return null;
}

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
