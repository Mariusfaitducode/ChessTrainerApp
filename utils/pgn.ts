/**
 * Utilitaires pour parser et manipuler le PGN
 */

/**
 * Parse le résultat d'une partie depuis le PGN
 */
export const parseGameResult = (pgn: string): "1-0" | "0-1" | "1/2-1/2" | "*" => {
  // Chercher le résultat dans les tags PGN
  const resultMatch = pgn.match(/\[Result\s+"([^"]+)"\]/);
  if (resultMatch) {
    const result = resultMatch[1];
    if (result === "1-0" || result === "0-1" || result === "1/2-1/2" || result === "*") {
      return result as "1-0" | "0-1" | "1/2-1/2" | "*";
    }
  }
  
  // Sinon, vérifier la fin du PGN
  if (pgn.includes("1-0")) return "1-0";
  if (pgn.includes("0-1")) return "0-1";
  if (pgn.includes("1/2-1/2")) return "1/2-1/2";
  
  return "*";
};

/**
 * Extrait le nom du joueur blanc depuis le PGN
 */
export const parseWhitePlayer = (pgn: string): string | null => {
  const match = pgn.match(/\[White\s+"([^"]+)"\]/);
  return match ? match[1] : null;
};

/**
 * Extrait le nom du joueur noir depuis le PGN
 */
export const parseBlackPlayer = (pgn: string): string | null => {
  const match = pgn.match(/\[Black\s+"([^"]+)"\]/);
  return match ? match[1] : null;
};

/**
 * Extrait la date de la partie depuis le PGN
 */
export const parseGameDate = (pgn: string): string | null => {
  const match = pgn.match(/\[Date\s+"([^"]+)"\]/);
  if (!match) return null;
  
  const dateStr = match[1];
  // Format PGN: "YYYY.MM.DD" ou "???.??.??"
  if (dateStr.includes("?") || dateStr.includes(".") === false) return null;
  
  try {
    const [year, month, day] = dateStr.split(".");
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toISOString();
  } catch {
    return null;
  }
};

/**
 * Extrait le time control depuis le PGN
 */
export const parseTimeControl = (pgn: string): string | null => {
  const match = pgn.match(/\[TimeControl\s+"([^"]+)"\]/);
  return match ? match[1] : null;
};
