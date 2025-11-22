/**
 * Hook pour gérer les prompts contextuels de création de compte
 * Affiche des prompts au bon moment pour encourager la création de compte
 */

import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useGuestMode } from "./useGuestMode";
import { useGames } from "./useGames";
import { useExercises } from "./useExercises";
import {
  GUEST_PROMPT_KEYS,
  GUEST_PROMPT_THRESHOLDS,
} from "@/types/guest";

export const usePrompts = () => {
  const { isGuest } = useGuestMode();
  const { games } = useGames();
  const { exercises } = useExercises(false); // Non complétés uniquement

  const [showSyncPrompt, setShowSyncPrompt] = useState(false);
  const [showExercisePrompt, setShowExercisePrompt] = useState(false);

  useEffect(() => {
    if (!isGuest) {
      // Réinitialiser les prompts si on n'est plus en mode guest
      setShowSyncPrompt(false);
      setShowExercisePrompt(false);
      return;
    }

    // Prompt après synchronisation de parties
    const checkSyncPrompt = async () => {
      try {
        const hasShown = await AsyncStorage.getItem(
          GUEST_PROMPT_KEYS.SYNC_PROMPT,
        );
        if (!hasShown && games.length >= GUEST_PROMPT_THRESHOLDS.GAMES_FOR_SYNC_PROMPT) {
          setShowSyncPrompt(true);
          await AsyncStorage.setItem(GUEST_PROMPT_KEYS.SYNC_PROMPT, "true");
        }
      } catch (error) {
        console.error("[usePrompts] Erreur vérification prompt sync:", error);
      }
    };

    // Prompt après résolution d'exercices
    const checkExercisePrompt = async () => {
      try {
        const hasShown = await AsyncStorage.getItem(
          GUEST_PROMPT_KEYS.EXERCISE_PROMPT,
        );
        const completedExercises = exercises.filter((e) => e.completed);
        if (
          !hasShown &&
          completedExercises.length >= GUEST_PROMPT_THRESHOLDS.EXERCISES_FOR_PROMPT
        ) {
          setShowExercisePrompt(true);
          await AsyncStorage.setItem(
            GUEST_PROMPT_KEYS.EXERCISE_PROMPT,
            "true",
          );
        }
      } catch (error) {
        console.error("[usePrompts] Erreur vérification prompt exercise:", error);
      }
    };

    checkSyncPrompt();
    checkExercisePrompt();
  }, [isGuest, games.length, exercises.length]);

  return {
    showSyncPrompt,
    showExercisePrompt,
    dismissSyncPrompt: () => setShowSyncPrompt(false),
    dismissExercisePrompt: () => setShowExercisePrompt(false),
  };
};

