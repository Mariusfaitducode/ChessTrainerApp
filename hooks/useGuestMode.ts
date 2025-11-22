/**
 * Hook pour gérer l'état du mode guest
 * Détecte si l'utilisateur est en mode guest (non authentifié)
 */

import { useMemo } from "react";
import { useSupabase } from "./useSupabase";

export interface UseGuestModeReturn {
  /**
   * True si l'utilisateur est en mode guest (non authentifié)
   */
  isGuest: boolean;
  /**
   * True si l'utilisateur est authentifié
   */
  isAuthenticated: boolean;
}

/**
 * Hook pour détecter le mode guest
 * @returns {UseGuestModeReturn} État du mode guest
 */
export const useGuestMode = (): UseGuestModeReturn => {
  const { session } = useSupabase();

  const isGuest = useMemo(() => !session?.user, [session]);

  return {
    isGuest,
    isAuthenticated: !isGuest,
  };
};

