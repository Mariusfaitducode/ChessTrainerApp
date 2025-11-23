import { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import {
  Clock,
  Zap,
  Flame,
  Timer,
  Trophy,
  XCircle,
  Minus,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from "lucide-react-native";

import type { Game } from "@/types/games";
import type { UserPlatform } from "@/types/platforms";
import { parseWhiteElo, parseBlackElo } from "@/utils/pgn";
import { colors, spacing, typography, shadows, borders } from "@/theme";

interface GameCardProps {
  game: Game;
  userPlatforms: UserPlatform[];
  onPress: () => void;
  isAnalyzing?: boolean;
}

const getTimeControlType = (
  timeControl: string | null,
): "bullet" | "blitz" | "rapid" | "classical" => {
  if (!timeControl) return "rapid";
  const parts = timeControl.split("+");
  const totalSeconds = parseInt(parts[0]) || 0;
  if (totalSeconds < 180) return "bullet";
  if (totalSeconds < 600) return "blitz";
  if (totalSeconds < 3600) return "rapid";
  return "classical";
};

const getTimeControlIcon = (
  type: "bullet" | "blitz" | "rapid" | "classical",
) => {
  switch (type) {
    case "bullet":
      return Zap;
    case "blitz":
      return Flame;
    case "rapid":
      return Clock;
    case "classical":
      return Timer;
  }
};

// On garde les icônes en noir pour le style wireframe, sauf exception
const ICON_COLOR = colors.text.primary;

const getResultStatus = (
  result: Game["result"],
  playedColor: "white" | "black",
): "win" | "loss" | "draw" => {
  if (!result) return "draw";
  if (result === "1/2-1/2") return "draw";
  if (result === "1-0") return playedColor === "white" ? "win" : "loss";
  if (result === "0-1") return playedColor === "black" ? "win" : "loss";
  return "draw";
};

const getResultIcon = (status: "win" | "loss" | "draw") => {
  switch (status) {
    case "win":
      return Trophy;
    case "loss":
      return XCircle;
    case "draw":
      return Minus;
  }
};

export const GameCard = ({
  game,
  userPlatforms,
  onPress,
  isAnalyzing = false,
}: GameCardProps) => {
  const platform = userPlatforms.find((p) => p.platform === game.platform);
  const userUsername = platform?.platform_username?.toLowerCase();

  const gameInfo = useMemo(() => {
    if (!userUsername) {
      return {
        playedColor: null as "white" | "black" | null,
        opponent: null as string | null,
        opponentElo: null as number | null,
      };
    }

    const whitePlayer = game.white_player?.toLowerCase() || "";
    const blackPlayer = game.black_player?.toLowerCase() || "";
    const whiteElo = parseWhiteElo(game.pgn);
    const blackElo = parseBlackElo(game.pgn);

    if (whitePlayer === userUsername) {
      return {
        playedColor: "white" as const,
        opponent: game.black_player || "Noirs",
        opponentElo: blackElo,
      };
    } else if (blackPlayer === userUsername) {
      return {
        playedColor: "black" as const,
        opponent: game.white_player || "Blancs",
        opponentElo: whiteElo,
      };
    }

    return {
      playedColor: null as "white" | "black" | null,
      opponent: game.white_player || game.black_player || "Adversaire",
      opponentElo: null,
    };
  }, [userUsername, game.white_player, game.black_player, game.pgn]);

  const resultStatus = gameInfo.playedColor
    ? getResultStatus(game.result, gameInfo.playedColor)
    : "draw";

  const timeControlType = getTimeControlType(game.time_control);
  const TimeControlIcon = getTimeControlIcon(timeControlType);
  const ResultIcon = getResultIcon(resultStatus);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.content}>
        {/* Icône type de partie (Noir simple) */}
        <View style={styles.iconContainer}>
          <TimeControlIcon size={20} color={ICON_COLOR} strokeWidth={2} />
        </View>

        {/* Info Adversaire */}
        <View style={styles.opponentContainer}>
          <Text style={styles.opponentName} numberOfLines={1}>
            vs {gameInfo.opponent || "Adversaire"}
          </Text>
          {gameInfo.opponentElo && (
            <Text style={styles.opponentElo}>({gameInfo.opponentElo})</Text>
          )}
        </View>

        {/* Badges d'analyse */}
        <View style={styles.analysisStatus}>
          {isAnalyzing ? (
            <Loader2
              size={16}
              color={colors.text.primary}
              style={styles.analysisIcon}
            />
          ) : game.analyzed_at ? (
            <View style={styles.badgesRow}>
              <CheckCircle2
                size={16}
                color={colors.text.primary}
                strokeWidth={2}
              />
              {game.blunders_count !== undefined && game.blunders_count > 0 && (
                <View style={styles.blundersBadge}>
                  <Text style={styles.blundersText}>
                    {game.blunders_count} ??
                  </Text>
                </View>
              )}
            </View>
          ) : null}
        </View>

        {/* Résultat */}
        <View style={styles.resultContainer}>
          <ResultIcon
            size={20}
            color={
              resultStatus === "win"
                ? colors.text.primary
                : colors.text.secondary
            }
            strokeWidth={2}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 16, // Moderne
    borderWidth: borders.width.thin, // Trait fin
    borderColor: colors.border.medium,
    padding: spacing[4], // Aéré
    marginBottom: spacing[3],
    ...shadows.sm, // Ombre légère
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: borders.radius.sm,
  },
  opponentContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  opponentName: {
    fontFamily: typography.fontFamily.body, // System
    fontSize: 16,
    fontWeight: "600",
    color: colors.text.primary,
  },
  opponentElo: {
    fontFamily: typography.fontFamily.body,
    fontSize: 16,
    color: colors.text.secondary,
  },
  analysisStatus: {
    flexDirection: "row",
    alignItems: "center",
  },
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  analysisIcon: {
    // Animation automatique
  },
  blundersBadge: {
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.chess.blunder, // On garde la couleur juste pour le trait rouge du blunder
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borders.radius.full,
  },
  blundersText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    color: colors.chess.blunder, // Texte rouge
  },
  resultContainer: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
});
