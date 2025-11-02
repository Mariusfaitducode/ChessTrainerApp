/**
 * Service pour l'API Lichess
 * Documentation: https://lichess.org/api
 *
 * Lichess a deux modes :
 * - API publique (sans auth) pour les données publiques
 * - API avec token (OAuth) pour les données privées
 *
 * Pour notre cas, on utilise l'API publique avec username
 */

const BASE_URL = "https://lichess.org/api";

export interface LichessUser {
  id: string;
  username: string;
  online?: boolean;
  perfs?: Record<string, any>;
  createdAt?: number;
  profile?: {
    country?: string;
    location?: string;
    bio?: string;
    firstName?: string;
    lastName?: string;
    fideRating?: number;
    uscfRating?: number;
    ecfRating?: number;
  };
  playTime?: {
    total: number;
    tv: number;
  };
  url?: string;
}

export interface LichessGame {
  id: string;
  rated: boolean;
  variant: string;
  speed: string;
  perf: string;
  createdAt: number;
  lastMoveAt: number;
  status: string;
  players: {
    white: {
      user?: {
        name: string;
      };
      rating?: number;
      ratingDiff?: number;
    };
    black: {
      user?: {
        name: string;
      };
      rating?: number;
      ratingDiff?: number;
    };
  };
  winner?: "white" | "black";
  moves: string;
  pgn?: string;
  clock?: {
    initial: number;
    increment: number;
    totalTime: number;
  };
}

/**
 * Récupère le profil public d'un joueur
 */
export const getUserProfile = async (
  username: string,
): Promise<LichessUser> => {
  const response = await fetch(`${BASE_URL}/user/${username}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Joueur "${username}" introuvable sur Lichess`);
    }
    throw new Error(`Erreur API Lichess: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Récupère les parties d'un joueur
 * @param username Nom d'utilisateur Lichess
 * @param max Nombre maximum de parties (défaut: 50)
 * @param since Timestamp de départ (optionnel)
 */
export const getUserGames = async (
  username: string,
  max: number = 50,
  since?: number,
): Promise<LichessGame[]> => {
  const params = new URLSearchParams({
    max: max.toString(),
  });

  if (since) {
    params.append("since", since.toString());
  }

  const response = await fetch(
    `${BASE_URL}/games/user/${username}?${params.toString()}`,
    {
      headers: {
        Accept: "application/x-ndjson",
      },
    },
  );

  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }
    throw new Error(
      `Erreur lors de la récupération des parties: ${response.statusText}`,
    );
  }

  // Lichess retourne du NDJSON (Newline Delimited JSON)
  const text = await response.text();

  if (!text || text.trim() === "") {
    return [];
  }

  const lines = text.trim().split("\n");

  const games: LichessGame[] = [];
  for (const line of lines) {
    if (line.trim()) {
      try {
        games.push(JSON.parse(line));
      } catch (error) {
        console.warn("[Lichess API] Erreur parsing ligne:", error, line);
      }
    }
  }

  return games;
};

/**
 * Récupère le PGN d'une partie spécifique
 */
export const getGamePGN = async (gameId: string): Promise<string> => {
  const response = await fetch(`${BASE_URL}/game/${gameId}.pgn`, {
    headers: {
      Accept: "application/x-chess-pgn",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Erreur lors de la récupération du PGN: ${response.statusText}`,
    );
  }

  return response.text();
};
