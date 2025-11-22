import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useDataService } from "./useDataService";
import { useSupabase } from "./useSupabase";
import { useGuestMode } from "./useGuestMode";
import type { UserPlatform } from "@/types/platforms";
import type { Platform } from "@/types/chess";
import { getPlayerProfile as getChessComProfile } from "@/services/chesscom/api";
import { getUserProfile as getLichessProfile } from "@/services/lichess/api";

export const useChessPlatform = () => {
  const dataService = useDataService();
  const { session } = useSupabase();
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
      return await dataService.getPlatforms();
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

      return await dataService.addPlatform(platform, username);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-platforms"] });
    },
  });

  const disconnectPlatform = useMutation({
    mutationFn: async (platformId: string) => {
      await dataService.removePlatform(platformId);
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
