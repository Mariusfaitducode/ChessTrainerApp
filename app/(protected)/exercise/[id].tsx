import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Chess } from "chess.js";
import {
  CheckCircle2,
  XCircle,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react-native";

import { useExercise } from "@/hooks/useExercise";
import { useExercises } from "@/hooks/useExercises";
import { useSupabase } from "@/hooks/useSupabase";
import { useQuery } from "@tanstack/react-query";
import { Chessboard } from "@/components/chess/Chessboard";
import { AnalysisBar } from "@/components/chess/AnalysisBar";
import type { ChessboardRef } from "@/components/chess/react-native-chessboard/src";
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

  // Calculer l'évaluation à partir de l'analyse
  // L'évaluation dans la DB est déjà en pawns (convertie lors de l'insertion)
  const currentEvaluation = useMemo(() => {
    if (
      analysisData?.evaluation === null ||
      analysisData?.evaluation === undefined
    ) {
      return 0;
    }
    // L'évaluation est déjà en pawns dans la DB
    return analysisData.evaluation;
  }, [analysisData]);
  const chessboardRef = useRef<ChessboardRef | null>(null);
  const [selectedMove, setSelectedMove] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
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

  // Trouver les exercices précédent et suivant
  const { previousExercise, nextExercise, currentIndex, totalExercises } =
    useMemo(() => {
      if (!exercise) {
        return {
          previousExercise: null,
          nextExercise: null,
          currentIndex: -1,
          totalExercises: 0,
        };
      }
      const pendingExercises = exercises.filter((e) => !e.completed);
      const index = pendingExercises.findIndex((e) => e.id === exercise.id);

      return {
        previousExercise: index > 0 ? pendingExercises[index - 1] : null,
        nextExercise:
          index >= 0 && index < pendingExercises.length - 1
            ? pendingExercises[index + 1]
            : null,
        currentIndex: index,
        totalExercises: pendingExercises.length,
      };
    }, [exercise, exercises]);

  // Vérifier si un coup est correct
  // Les coordonnées arrivent dans le système standard (blancs en bas)
  // react-native-chessboard garantit que seuls les coups valides peuvent être joués
  const checkMove = (from: string, to: string, promotion?: string): boolean => {
    if (!exercise?.correct_move || !chess) return false;

    try {
      const correctMove = exercise.correct_move.trim();
      const tempChess = new Chess(chess.fen());

      // Essayer d'abord comme LAN (format le plus probable depuis l'API)
      const lanPattern = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/i;
      const lanMatch = correctMove.match(lanPattern);

      let correctMovePlayed: any = null;

      if (lanMatch) {
        const [, lanFrom, lanTo, lanPromotion] = lanMatch;
        try {
          const tempMoveOptions: {
            from: string;
            to: string;
            promotion?: string;
          } = {
            from: lanFrom,
            to: lanTo,
          };
          if (lanPromotion) {
            tempMoveOptions.promotion = lanPromotion.toLowerCase();
          }
          correctMovePlayed = tempChess.move(tempMoveOptions);
        } catch {
          // Si ça échoue, essayer en SAN
        }
      }

      // Si ce n'est pas en LAN ou que ça a échoué, essayer en SAN
      if (!correctMovePlayed) {
        try {
          correctMovePlayed = tempChess.move(correctMove);
        } catch {
          return false;
        }
      }

      if (!correctMovePlayed) return false;

      // Comparer les coups joués (from/to/promotion)
      return (
        correctMovePlayed.from === from &&
        correctMovePlayed.to === to &&
        (correctMovePlayed.promotion || "") === (promotion || "")
      );
    } catch (error) {
      console.error(
        "[Exercise] Erreur lors de la vérification du coup:",
        error,
      );
      return false;
    }
  };

  // Navigation - utiliser replace pour éviter le rechargement complet
  const goToPrevious = useCallback(() => {
    if (previousExercise) {
      router.replace(`/(protected)/exercise/${previousExercise.id}` as any);
    }
  }, [previousExercise, router]);

  const goToNext = useCallback(() => {
    if (nextExercise) {
      router.replace(`/(protected)/exercise/${nextExercise.id}` as any);
    } else {
      router.replace("/(protected)/(tabs)/exercises" as any);
    }
  }, [nextExercise, router]);

  // Afficher la solution
  const handleShowSolution = () => {
    setShowSolution(true);
    Alert.alert(
      "Solution",
      `Le meilleur coup est : ${exercise?.correct_move || "N/A"}`,
      [{ text: "OK" }],
    );
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
    if (__DEV__) {
      console.log(
        `[Exercise] handleMove appelé: from=${move.from}, to=${move.to}, promotion=${move.promotion}`,
      );
    }

    if (
      !chess ||
      !exercise ||
      exercise.completed ||
      isCompleting ||
      showSolution
    ) {
      if (__DEV__) {
        console.log(
          `[Exercise] handleMove rejeté: chess=${!!chess}, exercise=${!!exercise}, completed=${exercise?.completed}, isCompleting=${isCompleting}, showSolution=${showSolution}`,
        );
      }
      return false;
    }

    setSelectedMove({ from: move.from, to: move.to });

    const correct = checkMove(move.from, move.to, move.promotion);
    setIsCorrect(correct);

    if (__DEV__) {
      console.log(`[Exercise] Coup ${correct ? "correct" : "incorrect"}`);
    }

    if (correct) {
      // Coup correct - marquer comme complété
      setIsCompleting(true);
      try {
        // Calculer le score (100 points de base, moins les tentatives)
        const score = Math.max(0, 100 - exercise.attempts * 10);

        await completeExercise({
          exerciseId: exercise.id,
          score,
          currentAttempts: exercise.attempts,
        });

        // Réinitialiser le feedback
        setIsCorrect(null);
        setSelectedMove(null);

        // Afficher un message de succès et passer au suivant
        Alert.alert(
          "Bravo !",
          "Vous avez trouvé le meilleur coup !",
          [
            {
              text: nextExercise ? "Exercice suivant" : "Terminé",
              onPress: () => {
                if (nextExercise) {
                  // Naviguer vers le prochain exercice
                  router.replace(
                    `/(protected)/exercise/${nextExercise.id}` as any,
                  );
                } else {
                  // Retourner à la liste des exercices
                  router.replace("/(protected)/(tabs)/exercises" as any);
                }
              },
            },
          ],
          { cancelable: false },
        );
      } catch (error) {
        console.error(
          "[Exercise] Erreur lors du marquage comme complété:",
          error,
        );
        Alert.alert(
          "Erreur",
          "Impossible de marquer l'exercice comme complété.",
        );
        setIsCompleting(false);
      }
    } else {
      // Coup incorrect - réinitialiser le plateau
      setIsCorrect(false);

      // Réinitialiser le plateau après un court délai
      setTimeout(() => {
        if (chessboardRef.current && exercise.fen) {
          try {
            chessboardRef.current.resetBoard(exercise.fen);
            setIsCorrect(null);
            setSelectedMove(null);
          } catch (error) {
            console.error("[Exercise] Erreur réinitialisation:", error);
          }
        }
      }, 1500); // Délai pour voir le feedback

      Alert.alert(
        "Coup incorrect",
        "Ce n'est pas le meilleur coup. Essayez encore !",
        [{ text: "OK" }],
      );
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
            {exercise.position_description}
          </Text>
        </View>
      )}

      {/* Plateau d'échecs avec barre d'analyse */}
      <View style={styles.chessboardWrapper}>
        <View style={styles.analysisBarContainer}>
          {analysisData && (
            <AnalysisBar
              evaluation={currentEvaluation}
              isWhiteToMove={chess?.turn() === "w"}
              bestMove={analysisData.best_move}
              moveQuality={analysisData.move_quality}
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
            onRefReady={(ref) => {
              chessboardRef.current = ref;
            }}
          />
        </View>
      </View>

      {/* Navigation et boutons d'aide */}
      <View style={styles.actionsContainer}>
        {/* Navigation */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[
              styles.navButton,
              !previousExercise && styles.navButtonDisabled,
            ]}
            onPress={goToPrevious}
            disabled={!previousExercise}
          >
            <ChevronLeft
              size={20}
              color={
                previousExercise ? colors.text.primary : colors.text.tertiary
              }
            />
          </TouchableOpacity>

          <View style={styles.exerciseCounter}>
            <Text style={styles.counterText}>
              {currentIndex >= 0
                ? `${currentIndex + 1} / ${totalExercises}`
                : "-"}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.navButton,
              !nextExercise && styles.navButtonDisabled,
            ]}
            onPress={goToNext}
            disabled={!nextExercise}
          >
            <ChevronRight
              size={20}
              color={nextExercise ? colors.text.primary : colors.text.tertiary}
            />
          </TouchableOpacity>
        </View>

        {/* Boutons indice et solution */}
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
      {showSolution && (
        <View style={styles.solutionContainer}>
          <Text style={styles.solutionLabel}>Solution :</Text>
          <Text style={styles.solutionText}>{exercise.correct_move}</Text>
        </View>
      )}

      {/* Feedback visuel */}
      {isCorrect !== null && (
        <View
          style={[
            styles.feedbackContainer,
            isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect,
          ]}
        >
          {isCorrect ? (
            <CheckCircle2 size={20} color={colors.success.main} />
          ) : (
            <XCircle size={20} color={colors.error.main} />
          )}
          <Text
            style={[
              styles.feedbackText,
              isCorrect
                ? styles.feedbackTextCorrect
                : styles.feedbackTextIncorrect,
            ]}
          >
            {isCorrect ? "Coup correct !" : "Coup incorrect"}
          </Text>
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
      {exercise.attempts > 0 && (
        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tentatives :</Text>
            <Text style={styles.infoValue}>{exercise.attempts}</Text>
          </View>
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
  navigationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background.secondary,
    padding: spacing[3],
    borderRadius: borders.radius.lg,
    ...shadows.sm,
  },
  helpButtonsContainer: {
    flexDirection: "row",
    gap: spacing[3],
  },
  navButton: {
    padding: spacing[2],
    borderRadius: borders.radius.md,
    backgroundColor: colors.background.tertiary,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  exerciseCounter: {
    flex: 1,
    alignItems: "center",
  },
  counterText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
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
    padding: spacing[4],
    borderRadius: borders.radius.lg,
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
    padding: spacing[3],
    borderRadius: borders.radius.md,
    marginBottom: spacing[4],
  },
  feedbackCorrect: {
    backgroundColor: colors.success.light,
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
    ...shadows.sm,
  },
  hintText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  infoContainer: {
    backgroundColor: colors.background.secondary,
    padding: spacing[4],
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
});
