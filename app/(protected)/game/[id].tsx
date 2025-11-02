import { useMemo, useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  InteractionManager,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGame } from "@/hooks/useGame";
import { useChessGame } from "@/hooks/useChessGame";
import { ChessboardWrapper } from "@/components/chess/Chessboard";
import { MoveList } from "@/components/chess/MoveList";
import { GameControls } from "@/components/chess/GameControls";
import { AnalysisBar } from "@/components/chess/AnalysisBar";
import { formatDate } from "@/utils/date";
import { formatTimeControl, getResultLabel } from "@/utils/chess";
import { colors, spacing, typography, shadows, borders } from "@/theme";

export default function GameDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { game, analyses, isLoading, error } = useGame(id);

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
  } = useChessGame(game?.pgn || null);

  // Trouver le dernier coup joué pour le highlight
  // Note: react-native-chessboard gère déjà le highlight automatiquement
  const lastMove = undefined;

  // Trouver l'analyse pour le coup courant
  const currentAnalysis = analyses.find(
    (a: { move_number: number }) => a.move_number === currentMoveIndex + 1,
  );

  // Différer le rendu des composants lourds sur mobile pour éviter de bloquer pendant la navigation
  const [readyToRenderHeavy, setReadyToRenderHeavy] = useState(false);

  useEffect(() => {
    if (game && !readyToRenderHeavy) {
      InteractionManager.runAfterInteractions(() => {
        setReadyToRenderHeavy(true);
      });
    }
  }, [game, readyToRenderHeavy]);

  // Mémoriser les moves aplatis
  const flattenedMoves = useMemo(() => {
    return moves.flatMap((m) => {
      const result: {
        moveNumber: number;
        white?: string;
        black?: string;
        fen: string;
      }[] = [];
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

  // Mémoriser le callback pour éviter les re-renders
  const handleMoveSelect = useCallback(
    (moveIndex: number) => {
      // moveIndex est l'index dans la liste aplatie
      // On doit trouver quel coup réel correspond
      const targetMoveIndex = Math.floor(moveIndex / 2) * 2;
      goToMove(Math.max(-1, targetMoveIndex - 1));
    },
    [goToMove],
  );

  // Ne pas bloquer sur isLoading si game est déjà disponible (cache)
  // Cela permet d'afficher immédiatement même si React Query marque comme loading
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

  const gameResult = getResultLabel(game.result);
  const isWhiteTurn = currentFen.split(" ")[1] === "w";

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* En-tête de la partie */}
      <View style={styles.header}>
        <View style={styles.players}>
          <View style={styles.playerInfo}>
            <Text style={styles.playerName} numberOfLines={1}>
              {game.white_player || "Blancs"}
            </Text>
            <View style={styles.resultBadge}>
              <Text style={styles.resultText}>
                {game.result === "1-0"
                  ? "✓"
                  : game.result === "0-1"
                    ? "✗"
                    : "="}
              </Text>
            </View>
          </View>
          <Text style={styles.vs}>vs</Text>
          <View style={styles.playerInfo}>
            <Text style={styles.playerName} numberOfLines={1}>
              {game.black_player || "Noirs"}
            </Text>
            <View style={styles.resultBadge}>
              <Text style={styles.resultText}>
                {game.result === "0-1"
                  ? "✓"
                  : game.result === "1-0"
                    ? "✗"
                    : "="}
              </Text>
            </View>
          </View>
        </View>
        <Text style={styles.meta}>
          {gameResult} • {formatTimeControl(game.time_control)} •{" "}
          {formatDate(game.played_at)}
        </Text>
      </View>

      {/* Échiquier - Différer le rendu sur mobile pour éviter de bloquer */}
      {readyToRenderHeavy ? (
        <>
          <View style={styles.chessboardContainer}>
            <ChessboardWrapper
              fen={currentFen}
              boardOrientation="white"
              lastMove={lastMove}
            />
          </View>

          {/* Barre d'analyse (si disponible) */}
          {currentAnalysis?.evaluation && (
            <View style={styles.analysisContainer}>
              <AnalysisBar
                evaluation={currentAnalysis.evaluation}
                isWhiteToMove={isWhiteTurn}
              />
            </View>
          )}

          {/* Contrôles de navigation */}
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

          {/* Liste des coups */}
          <View style={styles.movesSection}>
            <Text style={styles.sectionTitle}>Coups</Text>
            <MoveList
              moves={flattenedMoves}
              currentMove={currentMoveIndex}
              onMoveSelect={handleMoveSelect}
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

      {/* Infos supplémentaires */}
      <View style={styles.infoSection}>
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
    padding: spacing[4],
    paddingBottom: spacing[8],
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
  header: {
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  players: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: spacing[3],
  },
  playerInfo: {
    flex: 1,
    alignItems: "center",
  },
  playerName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  resultBadge: {
    width: spacing[8],
    height: spacing[8],
    borderRadius: borders.radius.full,
    backgroundColor: colors.orange[100],
    justifyContent: "center",
    alignItems: "center",
  },
  resultText: {
    fontSize: typography.fontSize.xl,
    color: colors.orange[600],
    fontWeight: typography.fontWeight.bold,
  },
  vs: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginHorizontal: spacing[4],
  },
  meta: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    textAlign: "center",
  },
  chessboardContainer: {
    marginBottom: spacing[4],
  },
  analysisContainer: {
    marginBottom: spacing[4],
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
