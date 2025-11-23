import { useContext, useEffect, useState, useRef, useCallback } from "react";

import { SupabaseClient, Session } from "@supabase/supabase-js";

import { SupabaseContext } from "@/context/supabase-context";
import { migrateGuestDataToDB } from "@/utils/migration";
import { LocalStorage } from "@/utils/local-storage";

interface UseSupabaseProps {
  isLoaded: boolean;
  session: Session | null | undefined;
  supabase: SupabaseClient;
  signOut: () => Promise<void>;
}

export const useSupabase = (): UseSupabaseProps => {
  const supabase = useContext(SupabaseContext);
  const [isLoaded, setIsLoaded] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const migrationDoneRef = useRef(false);

  /**
   * Gère la migration des données guest vers la DB
   * IMPORTANT : Ne s'exécute QUE si on a une session authentifiée
   */
  const handleMigration = useCallback(
    async (userId: string) => {
      if (!supabase) return;

      try {
        // Double vérification : s'assurer qu'on a bien une session
        const { data: currentSession } = await supabase.auth.getSession();
        if (!currentSession?.session?.user) {
          console.log(
            "[useSupabase] Pas de session, skip migration (mode guest)",
          );
          return;
        }

        // Vérifier si la migration a déjà été effectuée
        const hasMigrated = await LocalStorage.isMigrationCompleted();
        if (hasMigrated) {
          console.log("[useSupabase] Migration déjà effectuée, skip");
          migrationDoneRef.current = true;
          return;
        }

        // Vérifier s'il y a des données à migrer
        const guestGames = await LocalStorage.getGames();
        const guestPlatforms = await LocalStorage.getPlatforms();
        const guestExercises = await LocalStorage.getExercises();

        if (
          guestGames.length === 0 &&
          guestPlatforms.length === 0 &&
          guestExercises.length === 0
        ) {
          console.log("[useSupabase] Aucune donnée guest à migrer");
          migrationDoneRef.current = true;
          return;
        }

        console.log("[useSupabase] Démarrage de la migration...");
        await migrateGuestDataToDB(supabase, userId);
        migrationDoneRef.current = true;
        console.log("[useSupabase] Migration terminée avec succès");
      } catch (error) {
        console.error("[useSupabase] Erreur lors de la migration:", error);
        // Ne pas bloquer l'utilisateur en cas d'erreur
        // La migration pourra être réessayée plus tard
      }
    },
    [supabase],
  );

  useEffect(() => {
    if (!supabase) return;

    // Timeout de sécurité pour forcer isLoaded à true après 3 secondes max
    const timeoutId = setTimeout(() => {
      console.warn("[useSupabase] Timeout: forçant isLoaded à true");
      setIsLoaded(true);
    }, 3000);

    // Récupérer la session initiale
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          console.error("[useSupabase] Erreur getSession:", error);
        }
        setSession(data?.session ?? null);
        setIsLoaded(true);
        clearTimeout(timeoutId);

        // Migration si session existe déjà au chargement
        if (data?.session?.user && !migrationDoneRef.current) {
          handleMigration(data.session.user.id);
        }
      })
      .catch((error) => {
        console.error("[useSupabase] Erreur lors de getSession:", error);
        // Même en cas d'erreur, on marque comme chargé pour ne pas bloquer l'app
        setSession(null);
        setIsLoaded(true);
        clearTimeout(timeoutId);
      });

    // Écouter les changements d'authentification
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);

        // Migration automatique lors de la connexion
        // IMPORTANT : Seulement si on a une session authentifiée
        if (newSession?.user && !migrationDoneRef.current) {
          await handleMigration(newSession.user.id);
        }

        // Reset le flag lors de la déconnexion
        if (!newSession) {
          migrationDoneRef.current = false;
        }
      },
    );

    return () => {
      clearTimeout(timeoutId);
      listener.subscription.unsubscribe();
    };
  }, [supabase, handleMigration]);

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    migrationDoneRef.current = false; // Reset pour prochaine connexion
  };

  if (!supabase) {
    throw new Error("useSupabase must be used within a SupabaseProvider");
  }

  return { isLoaded, session, supabase, signOut };
};
