/**
 * Hook pour obtenir le service de données unifié
 * Cache la différence entre mode guest et authentifié
 */

import { useMemo } from "react";
import { useSupabase } from "./useSupabase";
import { useGuestMode } from "./useGuestMode";
import {
  createDataService,
  type DataService,
} from "@/services/data/data-service";

/**
 * Hook pour obtenir le service de données unifié
 * @returns {DataService} Service de données (guest ou authentifié selon le mode)
 */
export const useDataService = (): DataService => {
  const { supabase, session } = useSupabase();
  const { isGuest } = useGuestMode();

  return useMemo(
    () => createDataService(supabase, session || null, isGuest),
    [supabase, session, isGuest],
  );
};
