import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useSupabase } from "./useSupabase";
import { useGuestMode } from "./useGuestMode";
import { LocalStorage } from "@/utils/local-storage";
import type { UserPlatform } from "@/types/platforms";
import type { Platform } from "@/types/chess";
import { getPlayerProfile as getChessComProfile } from "@/services/chesscom/api";
import { getUserProfile as getLichessProfile } from "@/services/lichess/api";

export const useChessPlatform = () => {
  const { supabase, session } = useSupabase();
  const { isGuest } = useGuestMode();
  const queryClient = useQueryClient();

  const {
    data: platforms,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["user-platforms", isGuest ? "guest" : "authenticated"],
    queryFn: async () => {
      if (isGuest) {
        // Mode guest : utiliser LocalStorage
        const guestPlatforms = await LocalStorage.getPlatforms();
        // Convertir en format UserPlatform pour compatibilité
        return guestPlatforms.map((p) => ({
          id: `guest_${p.platform}`, // ID temporaire
          user_id: "guest", // ID temporaire
          platform: p.platform,
          platform_username: p.username,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_sync_at: null,
        })) as UserPlatform[];
      }

      // Mode authentifié : utiliser Supabase
      if (!session?.user) return [];

      const { data, error } = await supabase
        .from("user_platforms")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as UserPlatform[];
    },
    enabled: isGuest || !!session?.user,
  });

  const addPlatform = useMutation({
    mutationFn: async ({
      platform,
      username,
    }: {
      platform: Platform;
      username: string;
    }) => {
      // Valider que le username existe sur la plateforme (pour guest et auth)
      try {
        if (platform === "lichess") {
          await getLichessProfile(username);
        } else if (platform === "chesscom") {
          await getChessComProfile(username);
        }
      } catch (error: any) {
        throw new Error(
          error?.message ||
            `Le joueur "${username}" n'existe pas sur ${platform}`,
        );
      }

      if (isGuest) {
        // Mode guest : stocker localement
        await LocalStorage.addPlatform(platform, username);
        // Retourner au format UserPlatform pour compatibilité
        return {
          id: `guest_${platform}`,
          user_id: "guest",
          platform,
          platform_username: username,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_sync_at: null,
        } as UserPlatform;
      }

      // Mode authentifié : utiliser Supabase
      if (!session?.user) {
        throw new Error("User not authenticated");
      }

      // Vérifier si la plateforme existe déjà
      const { data: existing } = await supabase
        .from("user_platforms")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("platform", platform)
        .maybeSingle();

      if (existing) {
        // Mettre à jour
        const { data, error } = await supabase
          .from("user_platforms")
          .update({
            platform_username: username,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data as UserPlatform;
      } else {
        // Créer
        const { data, error } = await supabase
          .from("user_platforms")
          .insert({
            user_id: session.user.id,
            platform,
            platform_username: username,
          })
          .select()
          .single();

        if (error) throw error;
        return data as UserPlatform;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-platforms"] });
    },
  });

  const disconnectPlatform = useMutation({
    mutationFn: async (platformId: string) => {
      if (isGuest) {
        // Mode guest : supprimer du cache local
        // platformId est au format "guest_lichess" ou "guest_chesscom"
        const platform = platformId.replace("guest_", "") as Platform;
        await LocalStorage.removePlatform(platform);
      } else {
        // Mode authentifié : utiliser Supabase
        const { error } = await supabase
          .from("user_platforms")
          .delete()
          .eq("id", platformId);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-platforms"] });
    },
  });

  const getPlatform = (platform: Platform): UserPlatform | undefined => {
    return platforms?.find((p) => p.platform === platform);
  };

  return {
    platforms: platforms ?? [],
    isLoading,
    error,
    refetch,
    addPlatform: addPlatform.mutateAsync,
    disconnectPlatform: disconnectPlatform.mutateAsync,
    isAdding: addPlatform.isPending,
    isDisconnecting: disconnectPlatform.isPending,
    getPlatform,
  };
};
