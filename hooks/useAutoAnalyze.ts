import { useEffect, useRef } from "react";
import { useGames } from "./useGames";
import { useExercises } from "./useExercises";
import { useAnalyzeGames } from "./useAnalyzeGames";

const MIN_GAMES_WITH_EXERCISES = 3;
const CHECK_INTERVAL = 5000; // 5 secondes

/**
 * Hook pour analyser automatiquement les parties
 * - Vérifie le nombre de parties avec exercices non complétés
 * - Si < 3, analyse la prochaine partie non analysée dans l'ordre chronologique
 * - Les parties sont triées par date (played_at) décroissante (plus récentes en premier)
 */
export const useAutoAnalyze = () => {
  const { games, isLoading: isLoadingGames } = useGames();
  const { exercises, isLoading: isLoadingExercises } = useExercises(false); // Non complétés uniquement
  const { analyzeGames, isAnalyzing } = useAnalyzeGames();

  const isAnalyzingRef = useRef(false);
  const lastCheckRef = useRef<number>(0);

  useEffect(() => {
    // Éviter les vérifications trop fréquentes
    const now = Date.now();
    if (now - lastCheckRef.current < CHECK_INTERVAL) {
      return;
    }
    lastCheckRef.current = now;

    // Ne rien faire si on charge ou si on est déjà en train d'analyser
    if (
      isLoadingGames ||
      isLoadingExercises ||
      isAnalyzing ||
      isAnalyzingRef.current ||
      games.length === 0
    ) {
      return;
    }

    // Compter les parties avec exercices non complétés
    const gamesWithExercises = new Set(
      exercises.map((ex) => ex.game_id).filter((id): id is string => !!id),
    );
    const countGamesWithExercises = gamesWithExercises.size;

    // Si on a assez de parties avec exercices, ne rien faire
    if (countGamesWithExercises >= MIN_GAMES_WITH_EXERCISES) {
      return;
    }

    // Trier les parties par date décroissante (plus récentes en premier)
    // Cela garantit qu'on analyse dans l'ordre chronologique
    const sortedGames = [...games].sort((a, b) => {
      const dateA = a.played_at ? new Date(a.played_at).getTime() : 0;
      const dateB = b.played_at ? new Date(b.played_at).getTime() : 0;
      return dateB - dateA; // Décroissant (plus récentes en premier)
    });

    // Trouver la prochaine partie non analysée dans l'ordre chronologique
    const nextUnanalyzedGame = sortedGames.find(
      (game) => !game.analyzed_at && game.pgn,
    );

    if (!nextUnanalyzedGame) {
      return;
    }

    // Lancer l'analyse
    isAnalyzingRef.current = true;
    analyzeGames({ games: [nextUnanalyzedGame] })
      .then(() => {
        isAnalyzingRef.current = false;
      })
      .catch(() => {
        isAnalyzingRef.current = false;
      });
  }, [
    games,
    exercises,
    isLoadingGames,
    isLoadingExercises,
    isAnalyzing,
    analyzeGames,
  ]);
};
