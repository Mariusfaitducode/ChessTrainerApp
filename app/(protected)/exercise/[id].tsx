import { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Chess } from "chess.js";
import { CheckCircle2, XCircle, Lightbulb } from "lucide-react-native";

import { useExercise } from "@/hooks/useExercise";
import { Chessboard } from "@/components/chess/Chessboard";
import { colors, spacing, typography, shadows, borders } from "@/theme";

export default function ExerciseScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { exercise, isLoading, error } = useExercise(id);
  const [selectedMove, setSelectedMove] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);

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

  // Mettre à jour le header
  useEffect(() => {
    if (exercise) {
      navigation.setOptions({
        title: exercise.position_description || "Exercice",
      });
    }
  }, [exercise, navigation]);

  // Normaliser un coup pour la comparaison
  const normalizeMove = (move: string): string => {
    return move
      .replace(/[+#=!?]/g, "")
      .trim()
      .toLowerCase();
  };

  // Vérifier si un coup est correct
  const checkMove = (from: string, to: string): boolean => {
    if (!exercise?.correct_move || !chess) return false;

    try {
      // Vérifier si le coup est légal
      const move = chess.move({ from, to, promotion: "q" });
      if (!move) return false;

      // Comparer avec le coup correct
      const playedMove = move.san;
      const correctMove = exercise.correct_move;
      return normalizeMove(playedMove) === normalizeMove(correctMove);
    } catch {
      return false;
    }
  };

  // Gérer un coup joué
  const handleMove = (move: {
    from: string;
    to: string;
    promotion?: string;
  }): boolean => {
    if (!chess || !exercise || exercise.completed) return false;

    setSelectedMove({ from: move.from, to: move.to });

    const correct = checkMove(move.from, move.to);
    setIsCorrect(correct);

    if (correct) {
      // Coup correct
      Alert.alert("Bravo !", "Vous avez trouvé le meilleur coup !", [
        {
          text: "OK",
          onPress: () => {
            // TODO: Marquer l'exercice comme complété
          },
        },
      ]);
    } else {
      // Coup incorrect
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

      {/* Plateau d'échecs */}
      <View style={styles.boardContainer}>
        <Chessboard
          mode="exercise"
          fen={exercise.fen}
          onMove={handleMove}
          boardOrientation={boardOrientation}
          showCoordinates={true}
          highlightSquares={
            selectedMove ? [selectedMove.from, selectedMove.to] : []
          }
        />
      </View>

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

      {/* Indices */}
      {exercise.hints && exercise.hints.length > 0 && (
        <View style={styles.hintsContainer}>
          <TouchableOpacity
            style={styles.hintButton}
            onPress={() => setShowHint(!showHint)}
            activeOpacity={0.7}
          >
            <Lightbulb size={16} color={colors.warning.main} />
            <Text style={styles.hintButtonText}>
              {showHint ? "Masquer l'indice" : "Afficher un indice"}
            </Text>
          </TouchableOpacity>
          {showHint && (
            <View style={styles.hintContent}>
              <Text style={styles.hintText}>
                {exercise.hints[0] || "Aucun indice disponible"}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Informations supplémentaires */}
      <View style={styles.infoContainer}>
        {exercise.opponent && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Adversaire :</Text>
            <Text style={styles.infoValue}>{exercise.opponent}</Text>
          </View>
        )}
        {exercise.evaluation_loss !== undefined &&
          exercise.evaluation_loss > 0 && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Perte d&apos;évaluation :</Text>
              <Text style={styles.infoValue}>
                -{(exercise.evaluation_loss / 100).toFixed(1)} pawns
              </Text>
            </View>
          )}
        {exercise.attempts > 0 && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tentatives :</Text>
            <Text style={styles.infoValue}>{exercise.attempts}</Text>
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
    padding: spacing[4],
    paddingBottom: spacing[8],
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
  boardContainer: {
    marginBottom: spacing[4],
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
  hintsContainer: {
    marginBottom: spacing[4],
  },
  hintButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    padding: spacing[3],
    backgroundColor: colors.warning.light,
    borderRadius: borders.radius.md,
    marginBottom: spacing[2],
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
