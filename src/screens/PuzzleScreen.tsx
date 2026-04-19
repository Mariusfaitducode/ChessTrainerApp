import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Chess } from "chess.js";
import { openDb } from "@/db/db";
import * as puzzleRepo from "@/db/puzzleRepo";
import type { Puzzle } from "@/domain/types";
import { Chessboard } from "@/ui/Chessboard";
import { Button } from "@/ui/Button";
import { colors, spacing, typography } from "@/theme";

type Outcome = "pending" | "correct" | "incorrect" | "solutionShown";

const PIECE_NAMES: Record<string, string> = {
  p: "pion",
  n: "cavalier",
  b: "fou",
  r: "tour",
  q: "dame",
  k: "roi",
};

export function PuzzleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [outcome, setOutcome] = useState<Outcome>("pending");
  const [hint, setHint] = useState<string | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const db = await openDb();
      const p = await puzzleRepo.get(db, id);
      if (!cancelled) setPuzzle(p);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(
    () => () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    },
    [],
  );

  const fenTurnColor = useMemo(
    () => (puzzle ? puzzle.fen.split(" ")[1] : "w"),
    [puzzle],
  );

  if (!puzzle) return null;

  const handleMove = (uci: string): boolean => {
    if (outcome === "correct") return false;
    const isCorrect = uci === puzzle.bestMove;
    if (isCorrect) {
      (async () => {
        const db = await openDb();
        await puzzleRepo.markSolved(db, puzzle.id, Date.now());
      })();
      setOutcome("correct");
    } else {
      setOutcome("incorrect");
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => setOutcome("pending"), 1000);
    }
    return isCorrect;
  };

  const showHint = () => {
    const chess = new Chess(puzzle.fen);
    const piece = chess.get(puzzle.bestMove.slice(0, 2) as never);
    if (piece) {
      setHint(`Déplace ton ${PIECE_NAMES[piece.type]}`);
    }
  };

  const showSolution = () => {
    setOutcome("solutionShown");
  };

  const next = async () => {
    const db = await openDb();
    const remaining = await puzzleRepo.listUnsolved(db);
    const nextPuzzle = remaining.find((p) => p.id !== puzzle.id);
    if (nextPuzzle) {
      router.replace(`/puzzle/${nextPuzzle.id}`);
    } else {
      router.replace("/games");
    }
  };

  const highlights =
    outcome === "correct"
      ? {
          [puzzle.bestMove.slice(0, 2)]: "goodMove" as const,
          [puzzle.bestMove.slice(2, 4)]: "goodMove" as const,
        }
      : outcome === "incorrect"
        ? { [puzzle.bestMove.slice(2, 4)]: "badMove" as const }
        : outcome === "solutionShown"
          ? {
              [puzzle.bestMove.slice(0, 2)]: "goodMove" as const,
              [puzzle.bestMove.slice(2, 4)]: "goodMove" as const,
            }
          : {};

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <Text style={styles.quality}>
          {puzzle.quality.toUpperCase()} · coup {puzzle.moveNumber}
        </Text>

        <Chessboard
          fen={puzzle.fen}
          orientation={fenTurnColor as "w" | "b"}
          interactive={outcome === "pending" || outcome === "incorrect"}
          onMove={handleMove}
          highlights={highlights as never}
          size={320}
        />

        <Text style={styles.prompt}>
          {outcome === "correct"
            ? "Correct !"
            : outcome === "incorrect"
              ? "Pas le meilleur coup"
              : outcome === "solutionShown"
                ? `Solution : ${puzzle.bestMove}`
                : fenTurnColor === "w"
                  ? "Aux Blancs de jouer"
                  : "Aux Noirs de jouer"}
        </Text>

        {hint && <Text style={styles.hint}>{hint}</Text>}

        <View style={styles.actions}>
          {outcome === "pending" && (
            <>
              <Button label="Indice" variant="secondary" onPress={showHint} />
              <Button label="Solution" variant="ghost" onPress={showSolution} />
            </>
          )}
          {(outcome === "correct" || outcome === "solutionShown") && (
            <Button label="Suivant" onPress={next} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, padding: spacing.lg, gap: spacing.lg, alignItems: "center" },
  quality: {
    ...typography.label,
    color: colors.textMuted,
    alignSelf: "flex-start",
  },
  prompt: { ...typography.heading, color: colors.text },
  hint: { ...typography.body, color: colors.textMuted },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: "auto" },
});
