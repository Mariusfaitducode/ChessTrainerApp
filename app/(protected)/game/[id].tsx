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
    const analysis = analyses.find(
      (a) => a.move_number === currentMoveIndex + 1,
    );
    // Log pour debug
    if (analysis) {
      console.log("[GameDetail] currentAnalysis:", {
        move_number: analysis.move_number,
        evaluation: analysis.evaluation,
        evaluation_type: analysis.evaluation_type,
        mate_in: analysis.mate_in,
      });
    }
    return analysis;
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
        <ActivityIndicator size="large" color={colors.text.primary} />
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
          {/* Liste des coups (Au-dessus du plateau) */}
          <View style={styles.movesContainer}>
            <MoveList
              moves={flattenedMoves}
              currentMove={currentMoveIndex}
              onMoveSelect={handleMoveSelect}
              analyses={analyses}
            />
          </View>

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
                  evaluationType={currentAnalysis.evaluation_type || null}
                  mateIn={currentAnalysis.mate_in || null}
                  userColor={userColor}
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
                analysisData={currentAnalysis}
              />
            </View>
          </View>

          {/* Info Analyse (Style Banner) */}
          {currentAnalysis?.evaluation != null && (
            <View style={styles.analysisInfoContainer}>
              <Text style={styles.analysisInfoText}>
                {currentAnalysis.evaluation > 0
                  ? `+${currentAnalysis.evaluation.toFixed(2)}`
                  : currentAnalysis.evaluation.toFixed(2)}
              </Text>
              {currentAnalysis.move_quality && (
                <Text style={styles.analysisQualityText}>
                  {currentAnalysis.move_quality === "best"
                    ? "⭐ Meilleur coup"
                    : currentAnalysis.move_quality === "blunder"
                      ? "💥 Gaffe"
                      : currentAnalysis.move_quality === "mistake"
                        ? "❌ Erreur"
                        : currentAnalysis.move_quality === "inaccuracy"
                          ? "⚠️ Imprécision"
                          : "✓ Bon coup"}
                </Text>
              )}
            </View>
          )}

          {/* Contrôles de navigation (Sans Card) */}
          <View style={styles.controlsContainer}>
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
        </>
      ) : (
        <View style={styles.loadingPlaceholder}>
          <ActivityIndicator size="small" color={colors.text.primary} />
          <Text style={styles.loadingPlaceholderText}>
            Préparation de l&apos;échiquier...
          </Text>
        </View>
      )}
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
    fontFamily: typography.fontFamily.body,
  },
  errorText: {
    fontSize: typography.fontSize.base,
    color: colors.error.main,
    textAlign: "center",
    fontFamily: typography.fontFamily.body,
  },
  chessboardWrapper: {
    flexDirection: "row",
    alignItems: "stretch",
    width: "100%",
    marginBottom: spacing[2],
    borderBottomWidth: borders.width.thin, // Ligne fine sous l'échiquier
    borderBottomColor: colors.border.medium,
  },
  analysisBarContainer: {
    width: 16, // Un peu plus large pour la lisibilité
    alignSelf: "stretch",
    backgroundColor: colors.background.primary,
    borderRightWidth: borders.width.thin,
    borderRightColor: colors.border.medium,
  },
  chessboardContainer: {
    flex: 1,
    minWidth: 0,
  },
  analysisInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[4],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderBottomWidth: borders.width.thin,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.background.primary,
    marginBottom: spacing[4],
  },
  analysisInfoText: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text.primary,
    fontFamily: typography.fontFamily.body,
  },
  analysisQualityText: {
    fontSize: 16,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.body,
  },
  controlsContainer: {
    backgroundColor: colors.background.primary, // Fond blanc
    paddingHorizontal: spacing[4],
    marginBottom: spacing[4],
    // Plus de bordure, plus de shadow, plus de radius
  },
  movesContainer: {
    backgroundColor: colors.background.primary,
    paddingBottom: spacing[2], // Espace avant le plateau
    paddingTop: spacing[2],
    // Pas de bordure, le MoveList gère son scroll
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: typography.fontFamily.body,
    fontWeight: "600",
    marginBottom: spacing[3],
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  loadingPlaceholderText: {
    marginTop: spacing[3],
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.body,
  },
});
