/**
 * Hook pour gérer l'état de l'onboarding
 * Détecte si c'est la première arrivée et gère la navigation
 */

import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_KEY = "onboarding_completed";

export const useOnboarding = () => {
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<
    boolean | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkOnboardingStatus = useCallback(async () => {
    try {
      // Timeout de sécurité pour AsyncStorage (2 secondes max)
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), 2000),
      );
      const storagePromise = AsyncStorage.getItem(ONBOARDING_KEY);
      const completed = await Promise.race([storagePromise, timeoutPromise]);
      setIsOnboardingCompleted(completed === "true");
    } catch (error) {
      console.error("[useOnboarding] Erreur vérification:", error);
      setIsOnboardingCompleted(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkOnboardingStatus();
  }, [checkOnboardingStatus]);

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
      // Mettre à jour l'état immédiatement
      setIsOnboardingCompleted(true);
      setIsLoading(false);
    } catch (error) {
      console.error("[useOnboarding] Erreur sauvegarde:", error);
    }
  };

  return {
    isOnboardingCompleted,
    isLoading,
    completeOnboarding,
    refresh: checkOnboardingStatus,
  };
};

