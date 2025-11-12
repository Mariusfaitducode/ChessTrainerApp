import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Chess } from "chess.js";
import { uciToSan, convertUciToSanInText } from "@/utils/chess-move-format";
import { classifyMove } from "@/services/chess/analyzer";
import {
  CheckCircle2,
  XCircle,
  Lightbulb,
  Eye,
  RotateCcw,
  ArrowRight,
} from "lucide-react-native";

import { useExercise } from "@/hooks/useExercise";
import { useExercises } from "@/hooks/useExercises";
import { useSupabase } from "@/hooks/useSupabase";
import { useQuery } from "@tanstack/react-query";
import { Chessboard } from "@/components/chess/Chessboard";
import { AnalysisBar } from "@/components/chess/AnalysisBar";
import type { ChessboardRef } from "@/components/chess/react-native-chessboard/src";
import type { GameAnalysis } from "@/types/database";
import { colors, spacing, typography, shadows, borders } from "@/theme";

export default function ExerciseScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { supabase } = useSupabase();
  const { exercise, isLoading, error } = useExercise(id);
  const { completeExercise, exercises } = useExercises(false);

  // Récupérer l'évaluation pour la barre d'analyse
  const { data: analysisData } = useQuery({
    queryKey: ["exercise-analysis", exercise?.game_analysis_id],
    queryFn: async () => {
      if (!exercise?.game_analysis_id) return null;
      const { data, error } = await supabase
        .from("game_analyses")
        .select("evaluation, best_move, move_quality")
        .eq("id", exercise.game_analysis_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!exercise?.game_analysis_id,
  });

  const chessboardRef = useRef<ChessboardRef | null>(null);
  const [selectedMove, setSelectedMove] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [moveQuality, setMoveQuality] = useState<
    "best" | "excellent" | "good" | "inaccuracy" | "mistake" | "blunder" | null
  >(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [userMoveAnalysis, setUserMoveAnalysis] = useState<GameAnalysis | null>(
    null,
  );
  const [evaluationAfterMove, setEvaluationAfterMove] = useState<number | null>(
    null,
  );
  const [evaluationTypeAfter, setEvaluationTypeAfter] = useState<
    "cp" | "mate" | null
  >(null);
  const [mateInAfter, setMateInAfter] = useState<number | null>(null);

  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Créer une instance Chess pour valider les coups
  const chess = useMemo(() => {
    if (!exercise?.fen) return null;
    try {
      const game = new Chess();
      game.load(exercise.fen);
      return game;
    } catch {
      return null;
    }
  }, [exercise?.fen]);

  // Déterminer l'orientation du plateau (blanc ou noir à jouer)
  const boardOrientation = useMemo<"white" | "black">(() => {
    if (!chess) return "white";
    return chess.turn() === "w" ? "white" : "black";
  }, [chess]);

  // Calculer l'évaluation à partir de l'analyse
  // L'évaluation dans la DB est déjà en pawns (convertie lors de l'insertion)
  const currentEvaluation = useMemo(() => {
    // Si on a une évaluation après un coup joué, l'utiliser
    if (evaluationAfterMove !== null) {
      return evaluationAfterMove;
    }
    // Sinon, utiliser l'évaluation de la position initiale
    if (
      analysisData?.evaluation === null ||
      analysisData?.evaluation === undefined
    ) {
      return 0;
    }
    // L'évaluation est déjà en pawns dans la DB
    return analysisData.evaluation;
  }, [analysisData, evaluationAfterMove]);

  // Déterminer qui doit jouer après le coup (pour la barre d'analyse)
  const isWhiteToMoveAfter = useMemo(() => {
    if (userMoveAnalysis && chess) {
      // Créer un nouveau chess avec le FEN après le coup
      try {
        const tempChess = new Chess(userMoveAnalysis.fen);
        return tempChess.turn() === "w";
      } catch {
        return chess.turn() === "w";
      }
    }
    return chess?.turn() === "w";
  }, [userMoveAnalysis, chess]);

  // Trouver l'exercice suivant
  const { nextExercise } = useMemo(() => {
    if (!exercise) {
      return { nextExercise: null };
    }
    const pendingExercises = exercises.filter((e) => !e.completed);
    const index = pendingExercises.findIndex((e) => e.id === exercise.id);

    return {
      nextExercise:
        index >= 0 && index < pendingExercises.length - 1
          ? pendingExercises[index + 1]
          : null,
    };
  }, [exercise, exercises]);

  // Vérifier si un coup est correct
  // correct_move est maintenant en UCI (format: "e2e4", "g1f3", "e7e8q")
  // Les coordonnées arrivent dans le système standard (blancs en bas)
  // react-native-chessboard garantit que seuls les coups valides peuvent être joués
  const checkMove = (from: string, to: string, promotion?: string): boolean => {
    if (!exercise?.correct_move || !chess) return false;

    try {
      const correctMoveUci = exercise.correct_move.trim().toLowerCase();

      // Construire le coup UCI joué
      const playedMoveUci = (from + to + (promotion || "")).toLowerCase();

      // Comparaison directe UCI (simple et rapide)
      return playedMoveUci === correctMoveUci;
    } catch (error) {
      console.error(
        "[Exercise] Erreur lors de la vérification du coup:",
        error,
      );
      return false;
    }
  };

  // Navigation vers le suivant
  const goToNext = useCallback(() => {
    if (nextExercise) {
      router.replace(`/(protected)/exercise/${nextExercise.id}` as any);
    } else {
      router.replace("/(protected)/(tabs)/exercises" as any);
    }
  }, [nextExercise, router]);

  // Réessayer - réinitialiser le plateau
  const handleRetry = useCallback(() => {
    if (chessboardRef.current && exercise?.fen) {
      try {
        chessboardRef.current.resetBoard(exercise.fen);
        setIsCorrect(null);
        setSelectedMove(null);
        setMoveQuality(null);
        setUserMoveAnalysis(null);
        setEvaluationAfterMove(null);
      } catch (error) {
        console.error("[Exercise] Erreur réinitialisation:", error);
      }
    }
  }, [exercise?.fen]);

  // Passer au suivant - marquer comme complété et naviguer
  const handleNext = useCallback(async () => {
    if (!exercise) return;

    setIsCompleting(true);
    try {
      // Calculer le score (100 points de base, moins les tentatives)
      const attempts = exercise.attempts ?? 0;
      const score = Math.max(0, 100 - attempts * 10);

      await completeExercise({
        exerciseId: exercise.id,
        score,
        currentAttempts: attempts,
      });

      // Réinitialiser le feedback
      setIsCorrect(null);
      setSelectedMove(null);
      setMoveQuality(null);
      setUserMoveAnalysis(null);
      setEvaluationAfterMove(null);

      // Naviguer vers le suivant
      goToNext();
    } catch (error) {
      console.error(
        "[Exercise] Erreur lors du marquage comme complété:",
        error,
      );
      setIsCompleting(false);
    }
  }, [exercise, completeExercise, goToNext]);

  // Afficher la solution
  const handleShowSolution = () => {
    if (!exercise?.correct_move || !chess) return;

    try {
      const correctMoveUci = exercise.correct_move.trim();
      const tempChess = new Chess(chess.fen());

      // Jouer le coup UCI directement
      tempChess.move(correctMoveUci);

      // Mettre à jour le chessboard avec la position après le bon coup
      if (chessboardRef.current) {
        chessboardRef.current.resetBoard(tempChess.fen());
      }

      setShowSolution(true);
    } catch (error) {
      console.error(
        "[Exercise] Erreur lors de l'affichage de la solution:",
        error,
      );
      // Fallback : juste afficher la solution
      setShowSolution(true);
    }
  };

  // Mettre à jour le header avec les informations de l'exercice
  useEffect(() => {
    if (exercise) {
      const headerTitle = exercise.opponent || "Exercice";
      const headerSubtitle =
        exercise.evaluation_loss !== undefined && exercise.evaluation_loss > 0
          ? `-${(exercise.evaluation_loss / 100).toFixed(1)} pawns`
          : undefined;

      navigation.setOptions({
        title: headerTitle,
        headerTitle: () => (
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {headerTitle}
            </Text>
            {headerSubtitle && (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {headerSubtitle}
              </Text>
            )}
          </View>
        ),
        headerTitleStyle: {
          width: "100%",
        },
      });
    }
  }, [exercise, navigation]);

  // Réinitialiser le plateau quand on change d'exercice
  useEffect(() => {
    if (chessboardRef.current && exercise?.fen) {
      setTimeout(() => {
        try {
          chessboardRef.current?.resetBoard(exercise.fen);
          setIsCorrect(null);
          setSelectedMove(null);
          setMoveQuality(null);
          setIsAnalyzing(false);
          setUserMoveAnalysis(null);
          setEvaluationAfterMove(null);
          setEvaluationTypeAfter(null);
          setMateInAfter(null);
          setShowSolution(false);
          setShowHint(false);
        } catch (error) {
          console.error("[Exercise] Erreur réinitialisation:", error);
        }
      }, 100);
    }
  }, [exercise?.id, exercise?.fen]);

  // Gérer un coup joué
  const handleMove = async (move: {
    from: string;
    to: string;
    promotion?: string;
  }): Promise<boolean> => {
    if (
      !chess ||
      !exercise ||
      exercise.completed ||
      isCompleting ||
      showSolution
    ) {
      return false;
    }

    setSelectedMove({ from: move.from, to: move.to });
    setIsAnalyzing(true);
    setMoveQuality(null);

    // Construire le coup UCI
    const moveUci = (
      move.from +
      move.to +
      (move.promotion || "")
    ).toLowerCase();

    try {
      // Classifier le coup via le backend
      const classification = await classifyMove(exercise.fen, moveUci, 13);

      setMoveQuality(classification.move_quality);
      setEvaluationAfterMove(classification.evaluation_after);
      setEvaluationTypeAfter(classification.evaluation_type_after);
      setMateInAfter(classification.mate_in_after);

      // Calculer le FEN après le coup joué
      const tempChess = new Chess(exercise.fen);
      try {
        tempChess.move(moveUci);
      } catch (error) {
        console.error(
          "[Exercise] Erreur lors du calcul du FEN après coup:",
          error,
        );
      }

      // Créer une analyse temporaire pour afficher le badge et la flèche
      // On stocke opponent_best_move dans best_move pour afficher la flèche du meilleur coup de l'adversaire
      const tempAnalysis: GameAnalysis = {
        id: "", // Pas nécessaire pour l'affichage
        game_id: exercise.id,
        move_number: 0,
        fen: tempChess.fen(), // FEN après le coup joué
        evaluation: classification.evaluation_after,
        best_move: classification.opponent_best_move, // Meilleur coup de l'adversaire après le coup joué
        played_move: moveUci,
        move_quality: classification.move_quality,
        game_phase: null,
        evaluation_loss: classification.evaluation_loss,
        created_at: null,
        analysis_data: {
          opponent_best_move: classification.opponent_best_move,
        } as any,
      };
      setUserMoveAnalysis(tempAnalysis);

      // Vérifier si c'est le meilleur coup
      const correct =
        classification.move_quality === "best" ||
        (exercise.correct_move !== null &&
          exercise.correct_move !== undefined &&
          moveUci === exercise.correct_move.trim().toLowerCase());

      setIsCorrect(correct);
    } catch (error) {
      console.error("[Exercise] Erreur classification coup:", error);
      // Fallback : vérification simple
      const correct = checkMove(move.from, move.to, move.promotion);
      setIsCorrect(correct);
    } finally {
      setIsAnalyzing(false);
    }

    // Ne pas laisser le coup se jouer automatiquement
    return false;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.orange[500]} />
          <Text style={styles.loadingText}>
            Chargement de l&apos;exercice...
          </Text>
        </View>
      </View>
    );
  }

  if (error || !exercise) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error ? "Erreur lors du chargement" : "Exercice introuvable"}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      {/* Description */}
      {exercise.position_description && (
        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>
            {convertUciToSanInText(exercise.position_description, exercise.fen)}
          </Text>
        </View>
      )}

      {/* Plateau d'échecs avec barre d'analyse */}
      <View style={styles.chessboardWrapper}>
        <View style={styles.analysisBarContainer}>
          {(analysisData || userMoveAnalysis) && (
            <AnalysisBar
              evaluation={currentEvaluation}
              isWhiteToMove={
                userMoveAnalysis ? isWhiteToMoveAfter : chess?.turn() === "w"
              }
              bestMove={
                userMoveAnalysis?.best_move
                  ? uciToSan(
                      userMoveAnalysis.best_move,
                      userMoveAnalysis.fen,
                    ) || userMoveAnalysis.best_move
                  : analysisData?.best_move
                    ? uciToSan(analysisData.best_move, exercise.fen) ||
                      analysisData.best_move
                    : null
              }
              moveQuality={
                userMoveAnalysis?.move_quality || analysisData?.move_quality
              }
              evaluationType={evaluationTypeAfter}
              mateIn={mateInAfter}
              orientation="vertical"
              boardOrientation={boardOrientation}
            />
          )}
        </View>
        <View style={styles.chessboardContainer}>
          <Chessboard
            mode="exercise"
            fen={exercise.fen}
            onMove={handleMove}
            boardOrientation={boardOrientation}
            showCoordinates={true}
            highlightSquares={
              selectedMove ? [selectedMove.from, selectedMove.to] : []
            }
            analysisData={
              userMoveAnalysis
                ? (userMoveAnalysis as any)
                : isAnalyzing
                  ? null
                  : (analysisData as any)
            }
            showBestMoveArrow={showSolution || !!userMoveAnalysis}
            lastMove={selectedMove}
            onRefReady={(ref) => {
              chessboardRef.current = ref;
            }}
          />
        </View>
      </View>

      {/* Contenu en bas du Chessboard */}
      <View style={styles.bottomContentContainer}>
        {/* Boutons d'aide */}
        <View style={styles.actionsContainer}>
          <View style={styles.helpButtonsContainer}>
            {exercise.hints && exercise.hints.length > 0 && (
              <TouchableOpacity
                style={styles.hintButton}
                onPress={() => setShowHint(!showHint)}
                activeOpacity={0.7}
              >
                <Lightbulb size={16} color={colors.warning.main} />
                <Text style={styles.hintButtonText}>
                  {showHint ? "Masquer l'indice" : "Indice"}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.solutionButton,
                showSolution && styles.solutionButtonActive,
              ]}
              onPress={handleShowSolution}
              disabled={showSolution}
            >
              <Eye size={16} color={colors.orange[600]} />
              <Text style={styles.solutionButtonText}>
                {showSolution ? "Solution affichée" : "Solution"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Solution affichée */}
        {showSolution && exercise?.correct_move && (
          <View style={styles.solutionContainer}>
            <Text style={styles.solutionLabel}>Solution :</Text>
            <Text style={styles.solutionText}>
              {uciToSan(exercise.correct_move, exercise.fen) ||
                exercise.correct_move}
            </Text>
          </View>
        )}

        {/* Feedback visuel */}
        {(isCorrect !== null || moveQuality || isAnalyzing) && (
          <View
            style={[
              styles.feedbackContainer,
              isCorrect
                ? styles.feedbackCorrect
                : moveQuality === "excellent" || moveQuality === "good"
                  ? styles.feedbackGood
                  : isAnalyzing
                    ? styles.feedbackAnalyzing
                    : styles.feedbackIncorrect,
            ]}
          >
            {isAnalyzing ? (
              <>
                <ActivityIndicator size="small" color={colors.orange[500]} />
                <Text style={styles.feedbackText}>Analyse en cours...</Text>
              </>
            ) : isCorrect ? (
              <>
                <CheckCircle2 size={20} color={colors.success.main} />
                <Text style={[styles.feedbackText, styles.feedbackTextCorrect]}>
                  Coup correct !
                </Text>
              </>
            ) : moveQuality ? (
              <>
                {moveQuality === "excellent" || moveQuality === "good" ? (
                  <CheckCircle2 size={20} color={colors.success.main} />
                ) : (
                  <XCircle size={20} color={colors.error.main} />
                )}
                <Text
                  style={[
                    styles.feedbackText,
                    moveQuality === "excellent" || moveQuality === "good"
                      ? styles.feedbackTextGood
                      : styles.feedbackTextIncorrect,
                  ]}
                >
                  {moveQuality === "best"
                    ? "Meilleur coup !"
                    : moveQuality === "excellent"
                      ? "Excellent coup !"
                      : moveQuality === "good"
                        ? "Bon coup"
                        : moveQuality === "inaccuracy"
                          ? "Imprécision"
                          : moveQuality === "mistake"
                            ? "Erreur"
                            : moveQuality === "blunder"
                              ? "Erreur grave"
                              : "Coup incorrect"}
                </Text>
              </>
            ) : (
              <>
                <XCircle size={20} color={colors.error.main} />
                <Text
                  style={[styles.feedbackText, styles.feedbackTextIncorrect]}
                >
                  Coup incorrect
                </Text>
              </>
            )}
          </View>
        )}

        {/* Boutons d'action après un coup */}
        {!isAnalyzing && (isCorrect !== null || moveQuality) && (
          <View style={styles.actionButtonsContainer}>
            {isCorrect ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonSuccess]}
                onPress={handleNext}
                disabled={isCompleting}
              >
                <ArrowRight size={18} color={colors.success.dark} />
                <Text
                  style={[
                    styles.actionButtonText,
                    styles.actionButtonTextSuccess,
                  ]}
                >
                  {isCompleting ? "Enregistrement..." : "Passer au suivant"}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonRetry]}
                onPress={handleRetry}
              >
                <RotateCcw size={18} color={colors.error.dark} />
                <Text
                  style={[
                    styles.actionButtonText,
                    styles.actionButtonTextRetry,
                  ]}
                >
                  Réessayer
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Indice affiché */}
        {showHint && exercise.hints && exercise.hints.length > 0 && (
          <View style={styles.hintContent}>
            <Text style={styles.hintText}>
              {exercise.hints[0] || "Aucun indice disponible"}
            </Text>
          </View>
        )}

        {/* Informations supplémentaires */}
        {exercise.attempts !== null && exercise.attempts > 0 && (
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tentatives :</Text>
              <Text style={styles.infoValue}>{exercise.attempts}</Text>
            </View>
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
  content: {
    paddingBottom: spacing[8],
  },
  header: {
    marginBottom: spacing[4],
    backgroundColor: colors.background.secondary,
    padding: spacing[4],
    borderRadius: borders.radius.lg,
    ...shadows.sm,
  },
  headerInfo: {
    gap: spacing[2],
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  headerLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  headerValue: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  actionsContainer: {
    marginBottom: spacing[4],
    gap: spacing[3],
  },
  helpButtonsContainer: {
    flexDirection: "row",
    gap: spacing[3],
  },
  contentPadding: {
    paddingHorizontal: spacing[4],
  },
  solutionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    padding: spacing[3],
    backgroundColor: colors.orange[50],
    borderRadius: borders.radius.md,
    borderWidth: 1,
    borderColor: colors.orange[200],
  },
  solutionButtonActive: {
    backgroundColor: colors.orange[100],
    opacity: 0.8,
  },
  solutionButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.orange[600],
  },
  bottomContentContainer: {
    paddingHorizontal: spacing[4],
  },
  solutionContainer: {
    backgroundColor: colors.orange[50],
    padding: spacing[4],
    borderRadius: borders.radius.lg,
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.orange[200],
  },
  solutionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.orange[600],
    marginBottom: spacing[2],
  },
  solutionText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.orange[600],
    fontFamily: "monospace",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: spacing[2],
  },
  headerTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    flex: 1,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
    marginLeft: spacing[2],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing[3],
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing[8],
  },
  errorText: {
    fontSize: typography.fontSize.lg,
    color: colors.error.main,
    textAlign: "center",
  },
  descriptionContainer: {
    backgroundColor: colors.background.secondary,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderRadius: borders.radius.lg,
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  description: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
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
    alignItems: "center",
  },
  feedbackContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borders.radius.md,
    marginBottom: spacing[4],
  },
  feedbackCorrect: {
    backgroundColor: colors.success.light,
  },
  feedbackGood: {
    backgroundColor: colors.success.light,
  },
  feedbackAnalyzing: {
    backgroundColor: colors.orange[50],
  },
  feedbackIncorrect: {
    backgroundColor: colors.error.light,
  },
  feedbackText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  feedbackTextCorrect: {
    color: colors.success.dark,
  },
  feedbackTextGood: {
    color: colors.success.dark,
  },
  feedbackTextIncorrect: {
    color: colors.error.dark,
  },
  hintButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    padding: spacing[3],
    backgroundColor: colors.warning.light,
    borderRadius: borders.radius.md,
  },
  hintButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.warning.dark,
    fontWeight: typography.fontWeight.medium,
  },
  hintContent: {
    padding: spacing[3],
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.md,
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  hintText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  infoContainer: {
    backgroundColor: colors.background.secondary,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderRadius: borders.radius.lg,
    gap: spacing[2],
    ...shadows.sm,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  infoValue: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  actionButtonsContainer: {
    marginBottom: spacing[4],
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    padding: spacing[4],
    borderRadius: borders.radius.md,
    ...shadows.sm,
  },
  actionButtonSuccess: {
    backgroundColor: colors.success.light,
  },
  actionButtonRetry: {
    backgroundColor: colors.error.light,
  },
  actionButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  actionButtonTextSuccess: {
    color: colors.success.dark,
  },
  actionButtonTextRetry: {
    color: colors.error.dark,
  },
});
