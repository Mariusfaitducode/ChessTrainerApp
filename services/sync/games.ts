/**
 * Service de synchronisation des parties depuis les plateformes
 */

import type { Platform } from "@/types/chess";
import type { Game } from "@/types/games";
import { getAllPlayerGames, type ChessComGame } from "@/services/chesscom/api";
import {
  getUserGames,
  getGamePGN,
  type LichessGame,
} from "@/services/lichess/api";
import {
  parseGameResult,
  parseWhitePlayer,
  parseBlackPlayer,
  parseGameDate,
  parseTimeControl,
} from "@/utils/pgn";

/**
 * Extrait l'ID de la partie depuis l'URL Chess.com
 * Ex: "https://www.chess.com/game/live/123456789" -> "123456789"
 */
const extractChessComGameId = (url: string): string => {
  const match = url.match(/game\/(?:live|daily)\/(\d+)/);
  return match ? match[1] : url.split("/").pop() || url;
};

/**
 * Convertit une partie Chess.com vers notre format DB
 */
const convertChessComGame = (
  apiGame: ChessComGame,
  userId: string,
): Omit<Game, "id" | "imported_at" | "analyzed_at"> => {
  const gameId = extractChessComGameId(apiGame.url);
  const result = parseGameResult(apiGame.pgn);
  const whitePlayer = apiGame.white?.username || parseWhitePlayer(apiGame.pgn);
  const blackPlayer = apiGame.black?.username || parseBlackPlayer(apiGame.pgn);

  // Chess.com fournit end_time en timestamp Unix
  const playedAt = apiGame.end_time
    ? new Date(apiGame.end_time * 1000).toISOString()
    : parseGameDate(apiGame.pgn);

  return {
    user_id: userId,
    platform: "chesscom",
    platform_game_id: gameId,
    pgn: apiGame.pgn,
    white_player: whitePlayer,
    black_player: blackPlayer,
    result,
    time_control: apiGame.time_control || parseTimeControl(apiGame.pgn),
    played_at: playedAt,
  };
};

/**
 * Convertit une partie Lichess vers notre format DB
 * Pour Lichess, on doit récupérer le PGN séparément
 */
const convertLichessGame = async (
  apiGame: LichessGame,
  userId: string,
): Promise<Omit<Game, "id" | "imported_at" | "analyzed_at">> => {
  let pgn = apiGame.pgn;

  // Si le PGN n'est pas dans la réponse, on le récupère
  if (!pgn || pgn.trim() === "") {
    try {
      pgn = await getGamePGN(apiGame.id);
    } catch (error) {
      console.warn(
        `Impossible de récupérer le PGN pour la partie ${apiGame.id}:`,
        error,
      );
      // Créer un PGN minimal
      pgn = `[Event "Lichess Game"]\n[Site "lichess.org"]\n[White "${apiGame.players.white.user?.name || "?"}"]\n[Black "${apiGame.players.black.user?.name || "?"}"]\n[Result "*"]\n\n${apiGame.moves}`;
    }
  }

  const whitePlayer = apiGame.players.white.user?.name || parseWhitePlayer(pgn);
  const blackPlayer = apiGame.players.black.user?.name || parseBlackPlayer(pgn);

  // Déterminer le résultat
  let result: "1-0" | "0-1" | "1/2-1/2" | "*" = "*";
  if (apiGame.status === "mate" && apiGame.winner === "white") result = "1-0";
  else if (apiGame.status === "mate" && apiGame.winner === "black")
    result = "0-1";
  else if (apiGame.status === "draw" || apiGame.status === "stalemate")
    result = "1/2-1/2";
  else result = parseGameResult(pgn);

  // Time control depuis clock ou PGN
  let timeControl: string | null = null;
  if (apiGame.clock) {
    timeControl = `${apiGame.clock.initial}+${apiGame.clock.increment}`;
  } else {
    timeControl = parseTimeControl(pgn);
  }

  const playedAt = apiGame.lastMoveAt
    ? new Date(apiGame.lastMoveAt).toISOString()
    : parseGameDate(pgn);

  return {
    user_id: userId,
    platform: "lichess",
    platform_game_id: apiGame.id,
    pgn,
    white_player: whitePlayer,
    black_player: blackPlayer,
    result,
    time_control: timeControl,
    played_at: playedAt,
  };
};

/**
 * Convertit et prépare les parties pour l'insertion en DB
 */
export const prepareGamesForInsert = async (
  platform: Platform,
  apiGames: (ChessComGame | LichessGame)[],
  userId: string,
): Promise<Omit<Game, "id" | "imported_at" | "analyzed_at">[]> => {
  const games: Omit<Game, "id" | "imported_at" | "analyzed_at">[] = [];

  for (let i = 0; i < apiGames.length; i++) {
    const apiGame = apiGames[i];
    try {
      if (platform === "chesscom") {
        const converted = convertChessComGame(apiGame as ChessComGame, userId);
        games.push(converted);
      } else if (platform === "lichess") {
        const converted = await convertLichessGame(
          apiGame as LichessGame,
          userId,
        );
        games.push(converted);
      }
    } catch (error: any) {
      console.error(
        `[Sync] Erreur lors de la conversion de la partie ${i + 1}/${apiGames.length}:`,
        error,
      );
      // Continue même en cas d'erreur sur une partie
    }
  }

  console.log(
    `[Sync] ${games.length}/${apiGames.length} parties converties avec succès`,
  );

  return games;
};
