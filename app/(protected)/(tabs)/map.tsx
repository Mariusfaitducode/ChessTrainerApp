import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Lock, Check, Trophy, X, Play } from "lucide-react-native";
import Svg, { Path } from "react-native-svg";

import { useGames } from "@/hooks/useGames";
import { useExercises } from "@/hooks/useExercises";
import { useChessPlatform } from "@/hooks/useChessPlatform";
import { colors, spacing, typography, shadows, borders } from "@/theme";
import { getQualityBadgeImage } from "@/utils/chess-badge";
import { uciToSan } from "@/utils/chess-move-format";
import type { Exercise } from "@/types/exercises";
import type { Game } from "@/types/games";
import { parseWhiteElo, parseBlackElo } from "@/utils/pgn";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// --- CONFIGURATION DU LAYOUT ---
const NODE_SIZE = 70;
const NODE_MARGIN_VERTICAL = 20;
const HEADER_HEIGHT = 100;
const PATH_WIDTH = 4;
const X_VARIATION = 80; // Amplitude du zigzag
const ITEM_HEIGHT_EXERCISE = NODE_SIZE + NODE_MARGIN_VERTICAL; // Espace vertical par exercice

// Interface pour les éléments plats de la liste
type MapItemType = "game_header" | "exercise" | "start_point";

interface MapItem {
  id: string;
  type: MapItemType;
  index: number; // Index global pour le zigzag
  data?: {
    game?: Game;
    exercise?: Exercise;
    result?: "win" | "loss" | "draw" | null;
    opponentName?: string;
    opponentElo?: number | null;
    userColor?: "white" | "black" | null;
  };
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [containerWidth, setContainerWidth] = useState(SCREEN_WIDTH);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const {
    games,
    isLoading: isLoadingGames,
    refetch: refetchGames,
  } = useGames();
  const {
    exercises,
    isLoading: isLoadingExercises,
    refetch: refetchExercises,
  } = useExercises();
  const { platforms } = useChessPlatform();

  const isLoading = isLoadingGames || isLoadingExercises;

  const onRefresh = async () => {
    await Promise.all([refetchGames(), refetchExercises()]);
  };

  const normalizeUsername = (username: string | null): string => {
    return username?.toLowerCase().trim().replace(/\s+/g, "") || "";
  };

  // 1. Calcul du statut de verrouillage (Logique de progression stricte)
  const { lockedExerciseIds, currentExerciseId, completedCount } =
    useMemo(() => {
      if (!games.length || !exercises.length)
        return {
          lockedExerciseIds: new Set<string>(),
          currentExerciseId: null,
          completedCount: 0,
        };

      const gameDateMap = new Map(
        games.map((g) => {
          const dateStr = g.played_at || g.imported_at;
          return [g.id, dateStr ? new Date(dateStr).getTime() : 0];
        }),
      );

      // Tri pour la progression: Du plus ANCIEN au plus RÉCENT
      const progressionOrder = [...exercises].sort((a, b) => {
        const dateA = gameDateMap.get(a.game_id || "") || 0;
        const dateB = gameDateMap.get(b.game_id || "") || 0;
        if (dateA !== dateB) return dateA - dateB;
        return (a.move_number || 0) - (b.move_number || 0);
      });

      const lockedIds = new Set<string>();
      let firstIncompleteFound = false;
      let currentId: string | null = null;
      let done = 0;

      for (const ex of progressionOrder) {
        if (firstIncompleteFound) {
          lockedIds.add(ex.id);
        } else if (!ex.completed) {
          firstIncompleteFound = true;
          currentId = ex.id;
        } else {
          done++;
        }
      }

      return {
        lockedExerciseIds: lockedIds,
        currentExerciseId: currentId,
        completedCount: done,
      };
    }, [games, exercises]);

  // 2. Construction de la liste plate d'éléments pour l'affichage (Snake Path)
  const mapItems = useMemo<MapItem[]>(() => {
    if (!games.length || !exercises.length) return [];

    const items: MapItem[] = [];
    let globalIndex = 0;

    // Tri des parties pour l'affichage: RÉCENT (Haut) -> ANCIEN (Bas)
    // On veut afficher le "sommet" en haut.
    const sortedGames = [...games].sort((a, b) => {
      const dateStrA = a.played_at || a.imported_at;
      const dateStrB = b.played_at || b.imported_at;
      const dateA = dateStrA ? new Date(dateStrA).getTime() : 0;
      const dateB = dateStrB ? new Date(dateStrB).getTime() : 0;
      return dateB - dateA;
    });

    sortedGames.forEach((game) => {
      const gameExercises = exercises.filter((e) => e.game_id === game.id);

      if (gameExercises.length > 0) {
        // Préparation des données du jeu
        const userUsernames = platforms.map((p) =>
          normalizeUsername(p.platform_username),
        );
        const whitePlayer = normalizeUsername(game.white_player);
        const blackPlayer = normalizeUsername(game.black_player);

        let userColor: "white" | "black" | null = null;
        if (userUsernames.includes(whitePlayer)) userColor = "white";
        else if (userUsernames.includes(blackPlayer)) userColor = "black";

        const whiteElo = parseWhiteElo(game.pgn);
        const blackElo = parseBlackElo(game.pgn);
        const opponentElo = userColor === "white" ? blackElo : whiteElo;
        const opponentName =
          userColor === "white"
            ? game.black_player || "Adversaire"
            : game.white_player || "Adversaire";

        let result: "win" | "loss" | "draw" | null = null;
        if (game.result === "1-0")
          result = userColor === "white" ? "win" : "loss";
        else if (game.result === "0-1")
          result = userColor === "black" ? "win" : "loss";
        else if (game.result === "1/2-1/2") result = "draw";

        // 1. Ajouter Header de Partie
        items.push({
          id: `game-${game.id}`,
          type: "game_header",
          index: globalIndex++,
          data: {
            game,
            result,
            opponentName,
            opponentElo,
            userColor,
          },
        });

        // 2. Ajouter Exercices (Ordre DESCENDANT: Move N -> Move 1) pour affichage Haut -> Bas
        // Car on "monte" depuis le bas.
        const sortedExercises = [...gameExercises].sort(
          (a, b) => (b.move_number || 0) - (a.move_number || 0),
        );

        sortedExercises.forEach((ex) => {
          items.push({
            id: ex.id,
            type: "exercise",
            index: globalIndex++,
            data: { exercise: ex },
          });
        });
      }
    });

    // Ajouter le point de départ en bas
    items.push({
      id: "start-point",
      type: "start_point",
      index: globalIndex++,
    });

    return items;
  }, [games, exercises, platforms]);

  // --- LOGIQUE DE POSITIONNEMENT (SNAKE) ---
  const getPosition = useCallback(
    (index: number, type: MapItemType) => {
      const centerX = containerWidth / 2;

      if (type === "game_header" || type === "start_point") {
        return { x: centerX, isCentered: true };
      }

      // Zigzag pour les exercices
      // Sinusoidal
      const phase = index * 0.8;
      const xOffset = Math.sin(phase) * X_VARIATION;

      return { x: centerX + xOffset, isCentered: false };
    },
    [containerWidth],
  );

  // Calcul de la hauteur totale pour le SVG
  const getItemY = useCallback(
    (listIndex: number) => {
      let y = 0;
      for (let i = 0; i < listIndex; i++) {
        const item = mapItems[i];
        if (item.type === "game_header") y += HEADER_HEIGHT;
        else if (item.type === "exercise") y += ITEM_HEIGHT_EXERCISE;
        else if (item.type === "start_point") y += 100;
      }
      return y;
    },
    [mapItems],
  );

  const totalHeight = useMemo(() => {
    let h = 0;
    mapItems.forEach((item) => {
      if (item.type === "game_header") h += HEADER_HEIGHT;
      else if (item.type === "exercise") h += ITEM_HEIGHT_EXERCISE;
      else if (item.type === "start_point") h += 100;
    });
    return h + 100; // Padding bottom
  }, [mapItems]);

  // Génération du chemin SVG
  const pathData = useMemo(() => {
    if (mapItems.length < 2) return "";

    let d = "";

    mapItems.forEach((item, i) => {
      const currentPos = getPosition(item.index, item.type);
      const currentY =
        getItemY(i) +
        (item.type === "game_header" ? HEADER_HEIGHT / 2 : NODE_SIZE / 2); // Centre vertical de l'item

      if (i === 0) {
        d += `M ${currentPos.x} ${currentY}`;
      } else {
        // Courbe de Bézier cubique pour lisser
        const prevItem = mapItems[i - 1];
        const prevPos = getPosition(prevItem.index, prevItem.type);
        const prevY =
          getItemY(i - 1) +
          (prevItem.type === "game_header" ? HEADER_HEIGHT / 2 : NODE_SIZE / 2);

        const controlY = (prevY + currentY) / 2;

        d += ` C ${prevPos.x} ${controlY}, ${currentPos.x} ${controlY}, ${currentPos.x} ${currentY}`;
      }
    });

    return d;
  }, [mapItems, getPosition, getItemY]);

  // Scroll automatique vers l'exercice courant
  useEffect(() => {
    if (isLoading || mapItems.length === 0 || scrollViewHeight === 0) return;

    // Trouver la cible
    let targetIndex = -1;

    if (currentExerciseId) {
      targetIndex = mapItems.findIndex((i) => i.id === currentExerciseId);
    } else if (completedCount > 0 && lockedExerciseIds.size === 0) {
      // Tout fini -> Haut (Index 0 est le plus récent/haut)
      targetIndex = 0;
    } else {
      // Rien commencé ou defaut -> Bas (Start Point est à la fin)
      targetIndex = mapItems.length - 1;
    }

    if (targetIndex !== -1) {
      const y = getItemY(targetIndex);
      // On veut l'item en bas de l'écran (pour regarder vers le haut/futur)
      // offset + height = y + margin
      // offset = y - height + margin
      // Margin pour le décoller du bord bas (ex: 200px)
      const bottomMargin = 250;
      const offset = y - scrollViewHeight + bottomMargin;

      // Petit délai pour s'assurer que le rendu est stable
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, offset),
          animated: true,
        });
      }, 100);
    }
  }, [
    isLoading,
    mapItems,
    scrollViewHeight,
    currentExerciseId,
    completedCount,
    lockedExerciseIds.size,
    getItemY,
  ]);

  return (
    <View
      style={[styles.container, { paddingTop: insets.top }]}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Aventure</Text>
        <Text style={styles.subtitle}>{completedCount} exercices résolus</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        onLayout={(e) => setScrollViewHeight(e.nativeEvent.layout.height)}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { height: totalHeight }]} // Force height for SVG
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
        }
      >
        {/* ARRIÈRE-PLAN: Chemin SVG */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={containerWidth} height={totalHeight}>
            {/* Chemin ombré */}
            <Path
              d={pathData}
              stroke={colors.background.tertiary}
              strokeWidth={PATH_WIDTH + 4}
              fill="none"
              strokeLinecap="round"
            />
            {/* Chemin principal */}
            <Path
              d={pathData}
              stroke={colors.border.medium}
              strokeWidth={PATH_WIDTH}
              fill="none"
              strokeDasharray="10, 5"
              strokeLinecap="round"
            />
          </Svg>
        </View>

        {/* ITEMS: Noeuds et Headers */}
        {mapItems.map((item, i) => {
          const { x } = getPosition(item.index, item.type);
          const y = getItemY(i);

          if (item.type === "game_header") {
            const { opponentName, opponentElo, result } = item.data!;
            return (
              <View
                key={item.id}
                style={[styles.headerItemContainer, { top: y, left: x - 90 }]} // Centré (180 width)
              >
                <View style={styles.opponentSign}>
                  <View style={styles.opponentHeader}>
                    <Text style={styles.opponentLabel}>VS</Text>
                    {result === "win" && (
                      <Trophy
                        size={12}
                        color={colors.text.inverse}
                        style={{ marginLeft: 4 }}
                      />
                    )}
                    {result === "loss" && (
                      <X
                        size={12}
                        color={colors.text.inverse}
                        style={{ marginLeft: 4 }}
                      />
                    )}
                  </View>
                  <Text style={styles.opponentName} numberOfLines={1}>
                    {opponentName}
                  </Text>
                  {opponentElo && (
                    <Text style={styles.opponentElo}>({opponentElo})</Text>
                  )}
                </View>
              </View>
            );
          } else if (item.type === "start_point") {
            return (
              <View
                key={item.id}
                style={[styles.startPointContainer, { top: y, left: x - 40 }]}
              >
                <View style={styles.startDot} />
                <Text style={styles.startText}>DÉPART</Text>
              </View>
            );
          } else {
            // EXERCISE NODE
            const ex = item.data!.exercise!;
            const isCompleted = ex.completed;
            const isLocked = lockedExerciseIds.has(ex.id);
            const isCurrent = currentExerciseId === ex.id;
            const badgeImage = getQualityBadgeImage(ex.move_quality);
            const moveSan = ex.played_move
              ? ex.fen_before
                ? uciToSan(ex.played_move, ex.fen_before)
                : ex.played_move
              : "?";

            return (
              <View
                key={item.id}
                style={[
                  styles.nodeContainer,
                  {
                    top: y,
                    left: x - NODE_SIZE / 2,
                    height: NODE_SIZE,
                    width: NODE_SIZE,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.node,
                    isCompleted && styles.nodeCompleted,
                    isLocked && styles.nodeLocked,
                    isCurrent && styles.nodeCurrent,
                  ]}
                  onPress={() =>
                    !isLocked &&
                    router.push(`/(protected)/exercise/${ex.id}` as any)
                  }
                  activeOpacity={isLocked ? 1 : 0.7}
                  disabled={isLocked}
                >
                  <View style={styles.nodeContent}>
                    <Text
                      style={[styles.moveNumber, isLocked && styles.textLocked]}
                    >
                      #{ex.move_number}
                    </Text>
                    <Text
                      style={[styles.moveSan, isLocked && styles.textLocked]}
                    >
                      {moveSan}
                    </Text>
                  </View>

                  {/* Badge */}
                  {!isLocked && (
                    <View style={styles.badgeCorner}>
                      <Image
                        source={badgeImage}
                        style={styles.badgeImageSmall}
                      />
                    </View>
                  )}

                  {/* Lock */}
                  {isLocked && (
                    <View style={styles.lockOverlay}>
                      <Lock size={16} color={colors.text.tertiary} />
                    </View>
                  )}

                  {/* Check */}
                  {isCompleted && (
                    <View style={styles.checkBadge}>
                      <Check
                        size={10}
                        color={colors.text.inverse}
                        strokeWidth={4}
                      />
                    </View>
                  )}

                  {/* Current Indicator (Play Icon) */}
                  {isCurrent && (
                    <View style={styles.playBadge}>
                      <Play
                        size={12}
                        color={colors.background.primary}
                        fill={colors.background.primary}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          }
        })}

        {mapItems.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Ta carte est vide...</Text>
            <Text style={styles.emptyText}>
              Analyse tes parties pour générer des exercices et commencer
              l&apos;aventure !
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    backgroundColor: colors.background.primary,
    zIndex: 10,
    borderBottomWidth: borders.width.thin,
    borderBottomColor: colors.border.light,
  },
  title: {
    fontFamily: typography.fontFamily.display,
    fontSize: 32,
    color: colors.text.primary,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: "center",
    marginTop: spacing[1],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    // Height is managed dynamically
    paddingBottom: spacing[8],
  },
  // Positioning Containers
  headerItemContainer: {
    position: "absolute",
    width: 180,
    height: HEADER_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  nodeContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  startPointContainer: {
    position: "absolute",
    width: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  // Visual Components
  opponentSign: {
    backgroundColor: colors.text.primary,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: 12,
    borderWidth: borders.width.thin,
    borderColor: colors.text.primary,
    alignItems: "center",
    width: "100%",
    ...shadows.md,
  },
  opponentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  opponentLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: 10,
    color: colors.text.inverse,
    fontWeight: "700",
    letterSpacing: 1,
  },
  opponentName: {
    fontFamily: typography.fontFamily.body,
    fontSize: 14,
    color: colors.text.inverse,
    fontWeight: "600",
  },
  opponentElo: {
    fontFamily: typography.fontFamily.body,
    fontSize: 12,
    color: colors.text.disabled,
  },
  node: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.background.primary,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.text.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  nodeCompleted: {
    backgroundColor: colors.success.light,
    borderColor: colors.success.main,
    borderStyle: "dashed",
  },
  nodeLocked: {
    backgroundColor: colors.background.tertiary,
    borderColor: colors.border.medium,
    borderStyle: "solid",
    ...shadows.none,
  },
  nodeCurrent: {
    borderColor: colors.text.primary,
    borderWidth: 3,
    transform: [{ scale: 1.1 }],
    backgroundColor: colors.background.primary,
    ...shadows.md,
  },
  nodeContent: {
    alignItems: "center",
  },
  moveNumber: {
    fontFamily: typography.fontFamily.body,
    fontSize: 10,
    color: colors.text.tertiary,
    fontWeight: "600",
    marginBottom: 0,
  },
  moveSan: {
    fontFamily: typography.fontFamily.body,
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: "bold",
  },
  textLocked: {
    color: colors.text.tertiary,
  },
  badgeCorner: {
    position: "absolute",
    top: -8,
    right: -8,
    // backgroundColor: colors.background.primary,
    // borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    // borderWidth: 1,
    // borderColor: colors.border.light,
    // ...shadows.sm,
    zIndex: 5,
  },
  badgeImageSmall: {
    width: 28,
    height: 28,
    resizeMode: "contain",
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: 20,
  },
  checkBadge: {
    position: "absolute",
    bottom: -6,
    right: -6,
    backgroundColor: colors.success.main,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  playBadge: {
    position: "absolute",
    bottom: -10,
    alignSelf: "center",
    backgroundColor: colors.text.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.background.primary,
    zIndex: 10,
    ...shadows.sm,
  },
  startDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.text.primary,
    marginBottom: spacing[2],
    borderWidth: 4,
    borderColor: colors.border.light,
  },
  startText: {
    fontFamily: typography.fontFamily.body,
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  emptyState: {
    padding: spacing[8],
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.display,
    fontSize: 24,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  emptyText: {
    fontFamily: typography.fontFamily.body,
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: "center",
  },
});
