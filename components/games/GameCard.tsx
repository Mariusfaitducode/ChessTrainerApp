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
} from "lucide-react-native";

import type { Game } from "@/types/games";
import type { UserPlatform } from "@/types/platforms";
import { parseWhiteElo, parseBlackElo } from "@/utils/pgn";
import { colors, spacing, typography, shadows, borders } from "@/theme";

interface GameCardProps {
  game: Game;
  userPlatforms: UserPlatform[];
  onPress: () => void;
}

const getTimeControlType = (
  timeControl: string | null,
): "bullet" | "blitz" | "rapid" | "classical" => {
  if (!timeControl) return "rapid";

  // Parse time control (format: "time+increment" ou juste "time")
  const parts = timeControl.split("+");
  const totalSeconds = parseInt(parts[0]) || 0;

  // Bullet: < 3 minutes
  if (totalSeconds < 180) return "bullet";
  // Blitz: 3-10 minutes
  if (totalSeconds < 600) return "blitz";
  // Rapid: 10-60 minutes
  if (totalSeconds < 3600) return "rapid";
  // Classical: >= 60 minutes
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

const getTimeControlColor = (
  type: "bullet" | "blitz" | "rapid" | "classical",
) => {
  switch (type) {
    case "bullet":
      return colors.error.main;
    case "blitz":
      return colors.warning.main;
    case "rapid":
      return colors.orange[500];
    case "classical":
      return colors.text.secondary;
  }
};

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

const getResultColor = (status: "win" | "loss" | "draw") => {
  switch (status) {
    case "win":
      return colors.success.main;
    case "loss":
      return colors.error.main;
    case "draw":
      return colors.text.tertiary;
  }
};

export const GameCard = ({ game, userPlatforms, onPress }: GameCardProps) => {
  // Trouver la plateforme correspondante
  const platform = userPlatforms.find((p) => p.platform === game.platform);
  const userUsername = platform?.platform_username?.toLowerCase();

  // Déterminer la couleur jouée, l'adversaire et son ELO
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

    // Extraire les ELO du PGN
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
  const timeControlColor = getTimeControlColor(timeControlType);

  const ResultIcon = getResultIcon(resultStatus);
  const resultColor = getResultColor(resultStatus);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.content}>
        {/* Logo type de partie */}
        <View style={styles.iconContainer}>
          <TimeControlIcon size={20} color={timeControlColor} />
        </View>

        {/* Nom de l'adversaire et ELO */}
        <View style={styles.opponentContainer}>
          <Text style={styles.opponentName} numberOfLines={1}>
            {gameInfo.opponent || "Adversaire"}
          </Text>
          {gameInfo.opponentElo && (
            <Text style={styles.opponentElo}>{gameInfo.opponentElo}</Text>
          )}
        </View>

        {/* Résultat */}
        <View style={styles.resultContainer}>
          <ResultIcon size={20} color={resultColor} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.lg,
    padding: spacing[3],
    marginBottom: spacing[3],
    ...shadows.sm,
    borderLeftWidth: borders.width.medium,
    borderLeftColor: colors.orange[200],
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
  },
  opponentContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  opponentName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  opponentElo: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  resultContainer: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
});
