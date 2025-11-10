import { useMemo, useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  InteractionManager,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGame } from "@/hooks/useGame";
import { useChessGame } from "@/hooks/useChessGame";
import { useChessPlatform } from "@/hooks/useChessPlatform";
import { Chessboard } from "@/components/chess/Chessboard";
import { MoveList } from "@/components/chess/MoveList";
import { GameControls } from "@/components/chess/GameControls";
import { AnalysisBar } from "@/components/chess/AnalysisBar";
import { formatDate } from "@/utils/date";
import { uciToSan } from "@/utils/chess-move-format";
import { colors, spacing, typography, shadows, borders } from "@/theme";

export default function GameDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { game, analyses, isLoading, error } = useGame(id);
  const { platforms } = useChessPlatform();

  const {
    moves,
    currentFen,
    currentMoveIndex,
    totalMoves,
    goToStart,
    goToEnd,
    goToPrevious,
    goToNext,
    goToMove,
    isAtStart,
    isAtEnd,
    error: chessError,
    moveHistory,
    getFenForIndex,
  } = useChessGame(game?.pgn || null);

  // Déterminer si l'utilisateur joue les blancs ou les noirs
  const userColor = useMemo<"white" | "black">(() => {
    if (!game || platforms.length === 0) return "white";

    const normalizeUsername = (username: string | null): string => {
      return username?.toLowerCase().trim().replace(/\s+/g, "") || "";
    };

    const userUsernames = platforms.map((p) =>
      normalizeUsername(p.platform_username),
    );
    const whitePlayer = normalizeUsername(game.white_player);
    const blackPlayer = normalizeUsername(game.black_player);

    const isWhitePlayer = userUsernames.some(
      (username) => username && username === whitePlayer,
    );
    const isBlackPlayer = userUsernames.some(
      (username) => username && username === blackPlayer,
    );

    if (isWhitePlayer && !isBlackPlayer) return "white";
    if (isBlackPlayer && !isWhitePlayer) return "black";

    // En cas de match multiple, privilégier la plateforme de la partie
    if (isWhitePlayer && isBlackPlayer && game.platform) {
      const platformUsername = platforms
        .filter((p) => p.platform === game.platform)
        .map((p) => normalizeUsername(p.platform_username));

      if (platformUsername.some((u) => u === whitePlayer)) return "white";
      if (platformUsername.some((u) => u === blackPlayer)) return "black";
    }

    return "white";
  }, [game, platforms]);

  const boardOrientation = userColor === "white" ? "white" : "black";

  // Mettre à jour le header avec les noms des joueurs
  useEffect(() => {
    if (game) {
      navigation.setOptions({
        title: `${game.white_player || "Blancs"} vs ${game.black_player || "Noirs"}`,
      });
    }
  }, [game, navigation]);

  const currentAnalysis = useMemo(() => {
    if (currentMoveIndex === -1) return analyses[0];
    return analyses.find((a) => a.move_number === currentMoveIndex + 1);
  }, [currentMoveIndex, analyses]);

  // Calculer le FEN de la position précédente pour synchroniser le chess engine
  const previousFen = useMemo(() => {
    if (currentMoveIndex <= 0) return undefined;
    return getFenForIndex(currentMoveIndex - 1);
  }, [currentMoveIndex, getFenForIndex]);

  const [readyToRenderHeavy, setReadyToRenderHeavy] = useState(false);

  useEffect(() => {
    if (game && !readyToRenderHeavy) {
      InteractionManager.runAfterInteractions(() => {
        setReadyToRenderHeavy(true);
      });
    }
  }, [game, readyToRenderHeavy]);

  const flattenedMoves = useMemo(() => {
    return moves.flatMap((m) => {
      const result = [];
      if (m.white) {
        result.push({
          moveNumber: m.moveNumber,
          white: m.white,
          black: undefined,
          fen: m.fen,
        });
      }
      if (m.black) {
        result.push({
          moveNumber: m.moveNumber,
          white: undefined,
          black: m.black,
          fen: m.fen,
        });
      }
      return result;
    });
  }, [moves]);

  const handleMoveSelect = useCallback(
    (moveIndex: number) => {
      const targetMoveIndex = Math.floor(moveIndex / 2) * 2;
      goToMove(Math.max(-1, targetMoveIndex - 1));
    },
    [goToMove],
  );

  if (!game && isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.orange[500]} />
        <Text style={styles.loadingText}>Chargement de la partie...</Text>
      </View>
    );
  }

  if (error || !game) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>
          {error?.message || "Partie introuvable"}
        </Text>
      </View>
    );
  }

  if (chessError) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>
          Erreur lors du parsing de la partie: {chessError}
        </Text>
      </View>
    );
  }

  const isWhiteTurn = currentFen.split(" ")[1] === "w";

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {readyToRenderHeavy ? (
        <>
          {currentAnalysis?.evaluation != null && (
            <View style={styles.analysisInfoContainer}>
              <Text style={styles.analysisInfoText}>
                {currentAnalysis.evaluation > 0
                  ? `+${currentAnalysis.evaluation.toFixed(2)}`
                  : currentAnalysis.evaluation.toFixed(2)}
              </Text>
              {currentAnalysis.best_move && (
                <Text style={styles.analysisInfoText}>
                  Meilleur: {currentAnalysis.best_move}
                </Text>
              )}
              {currentAnalysis.move_quality && (
                <Text
                  style={[
                    currentAnalysis.move_quality === "blunder" ||
                    currentAnalysis.move_quality === "mistake" ||
                    currentAnalysis.move_quality === "inaccuracy"
                      ? styles.analysisMistakeText
                      : styles.analysisQualityText,
                  ]}
                >
                  {currentAnalysis.move_quality === "best"
                    ? "⭐ Meilleur coup"
                    : currentAnalysis.move_quality === "excellent"
                      ? "✨ Excellent"
                      : currentAnalysis.move_quality === "good"
                        ? "✓ Bon"
                        : currentAnalysis.move_quality === "inaccuracy"
                          ? "⚠️ Imprécision"
                          : currentAnalysis.move_quality === "mistake"
                            ? "❌ Erreur"
                            : currentAnalysis.move_quality === "blunder"
                              ? "💥 Erreur grave"
                              : ""}
                </Text>
              )}
              {currentAnalysis.game_phase && (
                <Text style={styles.analysisPhaseText}>
                  {currentAnalysis.game_phase === "opening"
                    ? "📖 Ouverture"
                    : currentAnalysis.game_phase === "middlegame"
                      ? "⚔️ Milieu"
                      : "🏁 Finale"}
                </Text>
              )}
            </View>
          )}

          <View style={styles.chessboardWrapper}>
            <View style={styles.analysisBarContainer}>
              {currentAnalysis && (
                <AnalysisBar
                  evaluation={currentAnalysis.evaluation || 0}
                  isWhiteToMove={isWhiteTurn}
                  bestMove={
                    currentAnalysis.best_move
                      ? uciToSan(
                          currentAnalysis.best_move,
                          previousFen || currentFen,
                        ) || currentAnalysis.best_move
                      : null
                  }
                  moveQuality={currentAnalysis.move_quality}
                  orientation="vertical"
                  boardOrientation={boardOrientation}
                />
              )}
            </View>

            <View style={styles.chessboardContainer}>
              <Chessboard
                mode="visualization"
                fen={currentFen}
                moveHistory={moveHistory}
                currentMoveIndex={currentMoveIndex}
                previousFen={previousFen}
                boardOrientation={boardOrientation}
              />
            </View>
          </View>

          <View
            style={[
              styles.controlsContainer,
              { paddingHorizontal: spacing[4] },
            ]}
          >
            <GameControls
              onFirst={goToStart}
              onPrevious={goToPrevious}
              onNext={goToNext}
              onLast={goToEnd}
              isAtStart={isAtStart}
              isAtEnd={isAtEnd}
              currentMove={currentMoveIndex}
              totalMoves={totalMoves}
            />
          </View>

          <View
            style={[styles.movesSection, { paddingHorizontal: spacing[4] }]}
          >
            <Text style={styles.sectionTitle}>Coups</Text>
            <MoveList
              moves={flattenedMoves}
              currentMove={currentMoveIndex}
              onMoveSelect={handleMoveSelect}
              analyses={analyses}
            />
          </View>
        </>
      ) : (
        <View style={styles.loadingPlaceholder}>
          <ActivityIndicator size="small" color={colors.orange[500]} />
          <Text style={styles.loadingPlaceholderText}>
            Préparation de l&apos;échiquier...
          </Text>
        </View>
      )}
      <View style={[styles.infoSection, { paddingHorizontal: spacing[4] }]}>
        <Text style={styles.sectionTitle}>Informations</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Plateforme</Text>
          <Text style={styles.infoValue}>
            {game.platform === "lichess" ? "Lichess" : "Chess.com"}
          </Text>
        </View>
        {game.analyzed_at && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Analysée</Text>
            <Text style={styles.infoValue}>{formatDate(game.analyzed_at)}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    padding: spacing[5],
  },
  content: {
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
    paddingHorizontal: 0,
  },
  loadingText: {
    marginTop: spacing[4],
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  errorText: {
    fontSize: typography.fontSize.base,
    color: colors.error.main,
    textAlign: "center",
  },
  analysisInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[4],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.background.secondary,
    marginBottom: spacing[2],
  },
  analysisInfoText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    fontFamily: "monospace",
  },
  analysisMistakeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.error.main,
  },
  analysisQualityText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.success.main,
  },
  analysisPhaseText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  chessboardWrapper: {
    flexDirection: "row",
    alignItems: "stretch",
    width: "100%",
    marginBottom: spacing[4],
  },
  analysisBarContainer: {
    width: 12,
    alignSelf: "stretch",
  },
  chessboardContainer: {
    flex: 1,
    minWidth: 0,
  },
  controlsContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.lg,
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  movesSection: {
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[3],
    color: colors.text.primary,
  },
  infoSection: {
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.lg,
    padding: spacing[4],
    ...shadows.sm,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing[3],
    borderBottomWidth: borders.width.thin,
    borderBottomColor: colors.border.light,
  },
  infoLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  infoValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  loadingPlaceholder: {
    padding: spacing[8],
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
  },
  loadingPlaceholderText: {
    marginTop: spacing[3],
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
});
