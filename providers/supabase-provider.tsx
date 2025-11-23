import { ReactNode, useMemo, useEffect } from "react";
import { AppState } from "react-native";

import { createClient, processLock } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { SupabaseContext } from "@/context/supabase-context";

interface SupabaseProviderProps {
  children: ReactNode;
}

export const SupabaseProvider = ({ children }: SupabaseProviderProps) => {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseKey) {
      console.error(
        "[SupabaseProvider] Variables d'environnement manquantes:",
        {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey,
        },
      );
      // Retourner un client "vide" pour éviter les crashes
      // Le hook useSupabase gérera l'erreur
      return createClient(
        supabaseUrl || "https://placeholder.supabase.co",
        supabaseKey || "placeholder-key",
        {
          auth: {
            storage: AsyncStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
            lock: processLock,
          },
        },
      );
    }

    return createClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock,
      },
    });
  }, [supabaseUrl, supabaseKey]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });
    return () => {
      subscription?.remove();
    };
  }, [supabase]);

  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  );
};
