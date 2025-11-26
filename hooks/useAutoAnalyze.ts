import { useEffect, useRef } from "react";
import { useGames } from "./useGames";
import { useExercises } from "./useExercises";
import { useAnalyzeGames } from "./useAnalyzeGames";
import type { Game } from "@/types/games";

const MIN_GAMES_WITH_EXERCISES = 3;
const CHECK_INTERVAL = 5000; // 5 secondes
const INITIAL_CHECK_DELAY = 1000; // 1 seconde après le chargement initial

interface UseAutoAnalyzeOptions {
  analyzeGames?: (params: { games: Game[] }) => Promise<any>;
  isAnalyzing?: boolean;
}

/**
 * Hook pour analyser automatiquement les parties
 * - Vérifie le nombre de parties avec exercices non complétés
 * - Si < 3, analyse la prochaine partie non analysée (la plus ancienne)
 * - Les parties sont triées par date (played_at) croissante (plus anciennes en premier)
 */
export const useAutoAnalyze = () => {
  const { games, isLoading: isLoadingGames } = useGames();
  const { exercises, isLoading: isLoadingExercises } = useExercises(false); // Non complétés uniquement
  const { analyzeGames, isAnalyzing } = useAnalyzeGames();

  return useAutoAnalyzeInternal({
    analyzeGames,
    isAnalyzing,
    games,
    exercises,
    isLoadingGames,
    isLoadingExercises,
  });
};

/**
 * Version interne qui accepte les fonctions en paramètre pour éviter les instances multiples
 */
export const useAutoAnalyzeInternal = ({
  analyzeGames: analyzeGamesFn,
  isAnalyzing: isAnalyzingValue,
  games,
  exercises,
  isLoadingGames,
  isLoadingExercises,
}: UseAutoAnalyzeOptions & {
  games: Game[];
  exercises: any[];
  isLoadingGames: boolean;
  isLoadingExercises: boolean;
}) => {
  // Utiliser les fonctions passées en paramètre ou créer une nouvelle instance
  const analyzeGamesHook = useAnalyzeGames();
  const analyzeGames = analyzeGamesFn || analyzeGamesHook.analyzeGames;
  const isAnalyzing =
    isAnalyzingValue !== undefined
      ? isAnalyzingValue
      : analyzeGamesHook.isAnalyzing;

  const isAnalyzingRef = useRef(false);
  const lastCheckRef = useRef<number>(0);
  const hasCheckedInitiallyRef = useRef(false);

  useEffect(() => {
    // Au premier chargement, attendre un peu puis vérifier immédiatement
    if (
      !hasCheckedInitiallyRef.current &&
      !isLoadingGames &&
      !isLoadingExercises
    ) {
      hasCheckedInitiallyRef.current = true;
      lastCheckRef.current = Date.now() - CHECK_INTERVAL + INITIAL_CHECK_DELAY; // Permettre le check immédiat
    }

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

    // Trier les parties par date croissante (plus anciennes en premier)
    // Cela garantit qu'on analyse les parties les plus anciennes en premier
    const sortedGames = [...games].sort((a, b) => {
      const dateA = a.played_at ? new Date(a.played_at).getTime() : 0;
      const dateB = b.played_at ? new Date(b.played_at).getTime() : 0;
      return dateA - dateB; // Croissant (plus anciennes en premier)
    });

    // Trouver la prochaine partie non analysée (la plus ancienne)
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
