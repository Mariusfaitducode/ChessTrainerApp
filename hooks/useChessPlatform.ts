import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useSupabase } from "./useSupabase";
import type { UserPlatform } from "@/types/platforms";
import type { Platform } from "@/types/chess";
import { getPlayerProfile as getChessComProfile } from "@/services/chesscom/api";
import { getUserProfile as getLichessProfile } from "@/services/lichess/api";

export const useChessPlatform = () => {
  const { supabase, session } = useSupabase();
  const queryClient = useQueryClient();

  const {
    data: platforms,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["user-platforms"],
    queryFn: async () => {
      if (!session?.user) return [];

      const { data, error } = await supabase
        .from("user_platforms")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as UserPlatform[];
    },
    enabled: !!session?.user,
  });

  const addPlatform = useMutation({
    mutationFn: async ({
      platform,
      username,
    }: {
      platform: Platform;
      username: string;
    }) => {
      if (!session?.user) {
        throw new Error("User not authenticated");
      }

      // Valider que le username existe sur la plateforme
      try {
        if (platform === "lichess") {
          await getLichessProfile(username);
        } else if (platform === "chesscom") {
          await getChessComProfile(username);
        }
      } catch (error: any) {
        throw new Error(
          error?.message || `Le joueur "${username}" n'existe pas sur ${platform}`
        );
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
      const { error } = await supabase
        .from("user_platforms")
        .delete()
        .eq("id", platformId);

      if (error) throw error;
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
