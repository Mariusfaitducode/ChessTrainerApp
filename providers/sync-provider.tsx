import React, { createContext, useContext, ReactNode } from "react";
import { useAutoSync } from "@/hooks/useAutoSync";
import { useAutoAnalyzeInternal } from "@/hooks/useAutoAnalyze";
import { useSyncGames } from "@/hooks/useSyncGames";
import { useAnalyzeGames } from "@/hooks/useAnalyzeGames";
import { useGames } from "@/hooks/useGames";
import { useExercises } from "@/hooks/useExercises";

interface SyncContextValue {
  // Synchronisation
  isSyncing: boolean;
  syncGames: ReturnType<typeof useSyncGames>["syncGames"];

  // Analyse
  isAnalyzing: boolean;
  analyzeGames: ReturnType<typeof useAnalyzeGames>["analyzeGames"];
  progress: ReturnType<typeof useAnalyzeGames>["progress"];
}

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

interface SyncProviderProps {
  children: ReactNode;
}

/**
 * Provider global pour la synchronisation et l'analyse des parties
 * - Déclenche automatiquement la sync et l'analyse indépendamment des pages
 * - Partage l'état globalement dans l'application
 */
export const SyncProvider = ({ children }: SyncProviderProps) => {
  // Hooks de synchronisation et d'analyse (instance unique partagée)
  const { syncGames, isSyncing } = useSyncGames({ silent: true });
  const { analyzeGames, isAnalyzing, progress } = useAnalyzeGames();
  const { games, isLoading: isLoadingGames } = useGames();
  const { exercises, isLoading: isLoadingExercises } = useExercises(false);

  // Déclenchement automatique (indépendant des pages)
  // Passer les fonctions pour éviter les instances multiples
  useAutoSync();
  useAutoAnalyzeInternal({
    analyzeGames,
    isAnalyzing,
    games,
    exercises,
    isLoadingGames,
    isLoadingExercises,
  });

  const value: SyncContextValue = {
    isSyncing,
    syncGames,
    isAnalyzing,
    analyzeGames,
    progress,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};

/**
 * Hook pour accéder à l'état de synchronisation et d'analyse
 */
export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSync must be used within SyncProvider");
  }
  return context;
};
