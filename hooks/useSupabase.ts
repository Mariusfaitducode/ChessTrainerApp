import { useContext, useEffect, useState, useRef } from "react";

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

  useEffect(() => {
    if (!supabase) return;

    // Récupérer la session initiale
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoaded(true);

      // Migration si session existe déjà au chargement
      if (data.session?.user && !migrationDoneRef.current) {
        handleMigration(data.session.user.id);
      }
    });

    // Écouter les changements d'authentification
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);

        // Migration automatique lors de la connexion
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
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  /**
   * Gère la migration des données guest vers la DB
   */
  const handleMigration = async (userId: string) => {
    try {
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
  };

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
