import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Play } from "lucide-react-native";

import { useGames } from "@/hooks/useGames";
import { useExercises } from "@/hooks/useExercises";
import { useChessPlatform } from "@/hooks/useChessPlatform";
import { colors, spacing, typography, borders, shadows } from "@/theme";
import { parseWhiteElo, parseBlackElo } from "@/utils/pgn";

// Nouveaux composants
import { GameNode } from "@/components/map/GameNode";
import { ExerciseNode } from "@/components/map/ExerciseNode";
import type { MapItem } from "@/types/map";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// --- CONFIGURATION DU LAYOUT ---
const NODE_SIZE = 70;
const NODE_MARGIN_VERTICAL = 20;
const HEADER_HEIGHT = 100; // Réduit pour être moins haut
const PATH_WIDTH = 4;
const X_VARIATION = 80;
const ITEM_HEIGHT_EXERCISE = NODE_SIZE + NODE_MARGIN_VERTICAL;

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

  const getGameType = (timeControl: string | null): string => {
    if (!timeControl) return "Standard";
    const baseTime = parseInt(timeControl.split("+")[0], 10);
    if (baseTime < 180) return "Bullet";
    if (baseTime < 600) return "Blitz";
    if (baseTime < 3600) return "Rapid";
    return "Classical";
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

        const gameType = getGameType(game.time_control);

        // Simulation Accuracy (à remplacer par vraie donnée si dispo)
        const accuracy = undefined;

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
            gameType,
            accuracy,
          },
        });

        // 2. Ajouter Exercices (Ordre DESCENDANT: Move N -> Move 1) pour affichage Haut -> Bas
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
    (index: number, type: "game_header" | "exercise" | "start_point") => {
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
            return <GameNode key={item.id} item={item} y={y} x={x} />;
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
            const isLeft = x < containerWidth / 2;

            return (
              <ExerciseNode
                key={item.id}
                item={item}
                y={y}
                x={x}
                lockedExerciseIds={lockedExerciseIds}
                currentExerciseId={currentExerciseId}
                onPress={(id) =>
                  router.push(`/(protected)/exercise/${id}` as any)
                }
                nodeSize={NODE_SIZE}
                mascotPosition={isLeft ? "right" : "left"}
              />
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

      {/* Bouton flottant "Continuer l'aventure" */}
      {currentExerciseId && (
        <View
          style={[
            styles.fabContainer,
            { bottom: insets.bottom > 0 ? insets.bottom + 20 : 30 },
          ]}
        >
          <TouchableOpacity
            style={styles.fab}
            onPress={() =>
              router.push(`/(protected)/exercise/${currentExerciseId}` as any)
            }
            activeOpacity={0.8}
          >
            <Play
              size={24}
              color={colors.text.inverse}
              fill={colors.text.inverse}
            />
            <Text style={styles.fabText}>Continuer</Text>
          </TouchableOpacity>
        </View>
      )}
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
    // Suppression de la bordure demandée
  },
  title: {
    fontFamily: typography.fontFamily.display,
    fontSize: 34,
    color: colors.text.primary,
    textAlign: "left", // Alignement gauche
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: "left", // Alignement gauche
    marginTop: spacing[1],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    // Height is managed dynamically
    paddingBottom: spacing[8],
  },
  startPointContainer: {
    position: "absolute",
    width: 80,
    alignItems: "center",
    justifyContent: "center",
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
  fabContainer: {
    position: "absolute",
    right: spacing[6],
    zIndex: 50,
  },
  fab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.text.primary,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    borderRadius: borders.radius.xl,
    gap: spacing[2],
    ...shadows.lg,
  },
  fabText: {
    fontFamily: typography.fontFamily.heading,
    fontSize: 18,
    fontWeight: "700",
    color: colors.text.inverse,
  },
});
