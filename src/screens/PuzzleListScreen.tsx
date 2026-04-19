import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { openDb } from "@/db/db";
import * as puzzleRepo from "@/db/puzzleRepo";
import type { Puzzle } from "@/domain/types";
import { colors, radius, spacing, typography } from "@/theme";

type Filter = "all" | "blunder" | "mistake" | "inaccuracy";

const QUALITY_LABEL: Record<Puzzle["quality"], string> = {
  blunder: "Blunder",
  mistake: "Erreur",
  inaccuracy: "Imprécision",
};

export function PuzzleListScreen() {
  const router = useRouter();
  const [all, setAll] = useState<Puzzle[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const db = await openDb();
      const puzzles = await puzzleRepo.listUnsolved(db);
      if (!cancelled) setAll(puzzles);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered =
    filter === "all" ? all : all.filter((p) => p.quality === filter);

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Problèmes</Text>

      <View style={styles.filters}>
        {(["all", "blunder", "mistake", "inaccuracy"] as Filter[]).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}
            >
              {f === "all" ? "Tous" : QUALITY_LABEL[f]}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlashList
        data={filtered}
        keyExtractor={(p) => p.id}
        ListEmptyComponent={<Text style={styles.empty}>Aucun problème.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push(`/puzzle/${item.id}`)}
          >
            <View
              style={[
                styles.dot,
                { backgroundColor: colors.quality[item.quality] },
              ]}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>
                {QUALITY_LABEL[item.quality]} · coup {item.moveNumber}
              </Text>
              <Text style={styles.rowMeta}>
                perte {(item.evalLoss / 100).toFixed(1)}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  title: { ...typography.heading, color: colors.text, padding: spacing.lg },
  filters: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.text, borderColor: colors.text },
  filterText: { ...typography.label, color: colors.text },
  filterTextActive: { color: "#fff" },
  empty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    padding: spacing.xl,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowTitle: { ...typography.body, color: colors.text, fontWeight: "600" },
  rowMeta: { ...typography.caption, color: colors.textMuted },
});
