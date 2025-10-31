/**
 * Service pour l'API publique Chess.com
 * Documentation: https://www.chess.com/news/view/published-data-api
 */

const BASE_URL = "https://api.chess.com/pub";

export interface ChessComPlayer {
  "@id": string;
  url: string;
  username: string;
  player_id: number;
  status: string;
  verified: boolean;
  league?: string;
}

export interface ChessComGame {
  url: string;
  pgn: string;
  time_control: string;
  end_time: number;
  rated: boolean;
  fen: string;
  time_class: string;
  rules: string;
  white: {
    rating: number;
    result: string;
    "@id": string;
    username: string;
  };
  black: {
    rating: number;
    result: string;
    "@id": string;
    username: string;
  };
}

export interface ChessComGameArchive {
  archives: Array<{
    year: number;
    month: number;
  }>;
}

/**
 * Récupère le profil d'un joueur
 */
export const getPlayerProfile = async (
  username: string,
): Promise<ChessComPlayer> => {
  const response = await fetch(`${BASE_URL}/player/${username}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Joueur "${username}" introuvable sur Chess.com`);
    }
    throw new Error(`Erreur API Chess.com: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Récupère la liste des archives disponibles pour un joueur
 */
export const getPlayerArchives = async (
  username: string,
): Promise<ChessComGameArchive> => {
  const response = await fetch(`${BASE_URL}/player/${username}/games/archives`);

  if (!response.ok) {
    throw new Error(
      `Erreur lors de la récupération des archives: ${response.statusText}`,
    );
  }

  return response.json();
};

/**
 * Récupère les parties d'un joueur pour un mois donné
 * @param username Nom d'utilisateur Chess.com
 * @param year Année (ex: 2024)
 * @param month Mois (1-12)
 */
export const getPlayerGames = async (
  username: string,
  year: number,
  month: number,
): Promise<ChessComGame[]> => {
  const monthStr = month.toString().padStart(2, "0");
  const response = await fetch(
    `${BASE_URL}/player/${username}/games/${year}/${monthStr}`,
  );

  if (!response.ok) {
    if (response.status === 404) {
      return []; // Aucune partie ce mois-ci
    }
    throw new Error(
      `Erreur lors de la récupération des parties: ${response.statusText}`,
    );
  }

  const data = await response.json();
  return data.games || [];
};

/**
 * Récupère toutes les parties d'un joueur
 * @param username Nom d'utilisateur
 * @param maxMonths Nombre maximum de mois à récupérer (défaut: 12)
 */
export const getAllPlayerGames = async (
  username: string,
  maxMonths: number = 12,
): Promise<ChessComGame[]> => {
  const archives = await getPlayerArchives(username);
  const allGames: ChessComGame[] = [];

  // Limiter au nombre de mois demandés (les plus récents)
  const sortedArchives = archives.archives
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    })
    .slice(0, maxMonths);

  // Récupérer les parties mois par mois
  for (const archive of sortedArchives) {
    try {
      const games = await getPlayerGames(username, archive.year, archive.month);
      allGames.push(...games);
    } catch (error) {
      console.warn(
        `Erreur lors de la récupération des parties pour ${archive.year}/${archive.month}:`,
        error,
      );
    }
  }

  return allGames;
};
