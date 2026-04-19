import { Chess } from 'chess.js';
import type { Color } from './types';

export interface ParsedMove {
  moveNumber: number;
  color: Color;
  san: string;
  uci: string;
  fenBefore: string;
  fenAfter: string;
}

export interface ParsedGame {
  headers: Record<string, string>;
  moves: ParsedMove[];
  result: string;
}

export function parseGame(pgn: string): ParsedGame {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch (e) {
    throw new Error(`Invalid PGN: ${(e as Error).message}`);
  }

  const headers = chess.header() as Record<string, string>;
  const history = chess.history({ verbose: true });

  // Check if PGN is malformed (no valid moves or headers found)
  if (history.length === 0 && !pgn.includes('[')) {
    throw new Error('Invalid PGN: No valid moves or headers found');
  }

  const replay = new Chess();
  const moves: ParsedMove[] = history.map((h, i) => {
    const fenBefore = replay.fen();
    replay.move({ from: h.from, to: h.to, promotion: h.promotion });
    const fenAfter = replay.fen();
    return {
      moveNumber: Math.floor(i / 2) + 1,
      color: h.color as Color,
      san: h.san,
      uci: h.from + h.to + (h.promotion ?? ''),
      fenBefore,
      fenAfter,
    };
  });

  return {
    headers,
    moves,
    result: headers.Result ?? '*',
  };
}

export function playerColor(
  headers: Record<string, string>,
  username: string,
): Color {
  const u = username.toLowerCase();
  if ((headers.White ?? '').toLowerCase() === u) return 'w';
  if ((headers.Black ?? '').toLowerCase() === u) return 'b';
  throw new Error(`User "${username}" not found in game headers`);
}
