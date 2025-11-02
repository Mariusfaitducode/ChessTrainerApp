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
  archives: string[]; // Array d'URLs comme "https://api.chess.com/pub/player/username/games/2021/03"
}

/**
 * Normalise le username pour Chess.com (tout en minuscules)
 * Chess.com est sensible à la casse
 */
const normalizeUsername = (username: string): string => {
  return username.toLowerCase();
};

/**
 * Récupère le profil d'un joueur
 */
export const getPlayerProfile = async (
  username: string,
): Promise<ChessComPlayer> => {
  const normalizedUsername = normalizeUsername(username);
  const response = await fetch(`${BASE_URL}/player/${normalizedUsername}`);

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
  const normalizedUsername = normalizeUsername(username);
  const response = await fetch(
    `${BASE_URL}/player/${normalizedUsername}/games/archives`,
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        `Joueur "${username}" introuvable. Vérifie que le username est correct (Chess.com est sensible à la casse).`,
      );
    }
    const errorData = await response.json().catch(() => null);
    if (errorData?.location) {
      throw new Error(
        `Erreur Chess.com: ${errorData.message || response.statusText}. URL suggérée: ${errorData.location}`,
      );
    }
    throw new Error(
      `Erreur lors de la récupération des archives: ${response.statusText}`,
    );
  }

  const data = await response.json();

  // Vérifier le format de la réponse
  if (!data || !data.archives || !Array.isArray(data.archives)) {
    console.warn("[Chess.com] Format de réponse inattendu:", data);
    return { archives: [] };
  }

  // Les archives sont un array d'URLs, on les retourne telles quelles
  return data;
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
  const normalizedUsername = normalizeUsername(username);
  const monthStr = month.toString().padStart(2, "0");
  const response = await fetch(
    `${BASE_URL}/player/${normalizedUsername}/games/${year}/${monthStr}`,
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
  
  // Chess.com peut retourner directement un tableau ou un objet avec une propriété games
  if (Array.isArray(data)) {
    return data;
  }
  
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

  if (!archives.archives || archives.archives.length === 0) {
    console.warn("[Chess.com] Aucune archive trouvée");
    return [];
  }

  // Parser les URLs pour extraire year et month
  // Format: "https://api.chess.com/pub/player/username/games/2021/03"
  const parsedArchives = archives.archives
    .map((url) => {
      const match = url.match(/games\/(\d{4})\/(\d{2})$/);
      if (match) {
        return {
          url,
          year: parseInt(match[1], 10),
          month: parseInt(match[2], 10),
        };
      }
      return null;
    })
    .filter(
      (a): a is { url: string; year: number; month: number } => a !== null,
    )
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    })
    .slice(0, maxMonths);

  if (parsedArchives.length === 0) {
    console.warn("[Chess.com] Aucune archive valide parsée");
    return [];
  }

  console.log(`[Chess.com] ${parsedArchives.length} archives à traiter`);

  // Récupérer les parties mois par mois
  for (const archive of parsedArchives) {
    try {
      console.log(`[Chess.com] Récupération ${archive.year}/${archive.month}`);
      const games = await getPlayerGames(username, archive.year, archive.month);
      allGames.push(...games);
      console.log(
        `[Chess.com] ${games.length} parties récupérées pour ${archive.year}/${archive.month}`,
      );
    } catch (error) {
      console.warn(
        `Erreur lors de la récupération des parties pour ${archive.year}/${archive.month}:`,
        error,
      );
    }
  }

  return allGames;
};
