import React from "react";
import { View, Text, StyleSheet, Image, Dimensions } from "react-native";
import { Zap, Target } from "lucide-react-native";
import { colors, spacing, typography, shadows } from "@/theme";
import type { MapItem } from "@/types/map";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Largeur de l'écran moins les marges standards (ex: 24px de chaque côté comme le dashboard)
const CARD_WIDTH = SCREEN_WIDTH - spacing[6] * 2;

interface GameNodeProps {
  item: MapItem;
  y: number;
  x: number;
}

export const GameNode = ({ item, y, x }: GameNodeProps) => {
  const { opponentName, opponentElo, result, gameType, accuracy } = item.data!;
  const isWin = result === "win";
  const isLoss = result === "loss";
  const isDraw = result === "draw";

  return (
    <View
      style={[
        styles.headerItemContainer,
        {
          top: y,
          // Centrer la carte : on part du centre (x) et on retire la moitié de la largeur de la carte
          // left = x - (CARD_WIDTH / 2)
          // Mais attention, x est déjà centré dans map.tsx, donc si x est SCREEN_WIDTH/2
          // On veut left = (SCREEN_WIDTH - CARD_WIDTH) / 2
          // Ici x est dynamique selon le snake path, mais pour le header on veut qu'il soit FIXE et centré.
          // Donc on ignore x pour le centrage horizontal, on utilise juste y.
          left: (SCREEN_WIDTH - CARD_WIDTH) / 2,
          width: CARD_WIDTH,
        },
      ]}
    >
      <View style={styles.gameCard}>
        {/* Top Bar: Badge Type (Right) */}
        <View style={styles.gameCardHeader}>
          <View style={styles.gameTypeBadge}>
            <Zap
              size={10}
              color={colors.text.primary}
              style={{ marginRight: 2 }}
            />
            <Text style={styles.gameTypeText}>{gameType}</Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.gameCardBody}>
          {/* Left Icon (Result) */}
          <View style={styles.resultIconContainer}>
            {isWin && (
              <Image
                source={require("@/assets/game-result/win.png")}
                style={styles.resultImage}
              />
            )}
            {isLoss && (
              <Image
                source={require("@/assets/game-result/lose.png")}
                style={styles.resultImage}
              />
            )}
            {isDraw && (
              <Image
                source={require("@/assets/game-result/draw.png")}
                style={styles.resultImage}
              />
            )}
          </View>

          {/* Center Info */}
          <View style={styles.opponentInfo}>
            <Text style={styles.opponentName} numberOfLines={1}>
              {opponentName}{" "}
              <Text style={styles.opponentElo}>({opponentElo || "?"})</Text>
            </Text>
            {/* Stats en dessous du nom */}
            <View style={styles.miniStatRow}>
              <Target
                size={12}
                color={colors.text.tertiary}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.statText}>
                {accuracy ? `${accuracy}%` : "Analyse..."}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerItemContainer: {
    position: "absolute",
    height: 100, // Fixed height matching HEADER_HEIGHT in map.tsx
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  gameCard: {
    width: "100%",
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.border.light,
    ...shadows.md,
    overflow: "hidden",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  gameCardHeader: {
    position: "absolute",
    top: 10,
    right: 12,
    zIndex: 10,
  },
  gameTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gameTypeText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.body,
    color: colors.text.primary,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  gameCardBody: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  resultIconContainer: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing[3],
  },
  resultImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  opponentInfo: {
    flex: 1,
    justifyContent: "center",
    paddingRight: 60, // Espace pour le badge à droite
  },
  opponentName: {
    fontFamily: typography.fontFamily.body,
    fontSize: 18,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: 4,
  },
  opponentElo: {
    fontFamily: typography.fontFamily.body,
    fontSize: 16,
    fontWeight: "400",
    color: colors.text.secondary,
  },
  miniStatRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.body,
    color: colors.text.tertiary,
    fontWeight: "600",
  },
});
