import { useCallback, useEffect, useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { openDb } from "@/db/db";
import * as gameRepo from "@/db/gameRepo";
import * as puzzleRepo from "@/db/puzzleRepo";
import { useAppStore } from "@/stores/appStore";
import { syncAndAnalyze } from "@/services/sync";
import { getEngine } from "@/services/stockfish";
import { Button } from "@/ui/Button";
import { colors, radius, spacing, typography } from "@/theme";
import type { Game } from "@/domain/types";

export function GamesScreen() {
  const router = useRouter();
  const username = useAppStore((s) => s.username);
  const isSyncing = useAppStore((s) => s.isSyncing);
  const progress = useAppStore((s) => s.syncProgress);
  const setSyncing = useAppStore((s) => s.setSyncing);
  const setSyncProgress = useAppStore((s) => s.setSyncProgress);

  const [games, setGames] = useState<Game[]>([]);
  const [unsolved, setUnsolved] = useState(0);

  const reload = useCallback(async () => {
    const db = await openDb();
    const [gs, u] = await Promise.all([
      gameRepo.listAll(db),
      puzzleRepo.countUnsolved(db),
    ]);
    setGames(gs);
    setUnsolved(u);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const onSync = async () => {
    if (!username || isSyncing) return;
    const controller = new AbortController();
    setSyncing(true);
    setSyncProgress({ current: 0, total: 0 });
    try {
      await syncAndAnalyze({
        username,
        engine: getEngine(),
        max: 20,
        depth: 15,
        signal: controller.signal,
        onProgress: (current, total) => setSyncProgress({ current, total }),
      });
      await reload();
    } catch (e) {
      console.error("[sync] failed", e);
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  };

  if (!username) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.user}>{username}</Text>
      </View>

      <View style={styles.puzzleCard}>
        <Text style={styles.puzzleCount}>
          {unsolved} problème{unsolved > 1 ? "s" : ""} à résoudre
        </Text>
        {unsolved > 0 && (
          <Button
            label="Voir les problèmes"
            onPress={() => router.push("/puzzles")}
          />
        )}
      </View>

      <View style={styles.syncRow}>
        <Button
          label={
            isSyncing && progress
              ? `Analyse ${progress.current}/${progress.total}...`
              : "Synchroniser"
          }
          onPress={onSync}
          loading={isSyncing}
          variant="secondary"
        />
      </View>

      <FlashList
        data={games}
        keyExtractor={(g) => g.id}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={reload} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            Aucune partie. Synchronise pour importer tes parties Chess.com.
          </Text>
        }
        renderItem={({ item }) => {
          const opponent = item.userColor === "w" ? item.black : item.white;
          const userWon =
            (item.userColor === "w" && item.result === "1-0") ||
            (item.userColor === "b" && item.result === "0-1");
          const draw = item.result === "1/2-1/2";
          return (
            <View style={styles.gameRow}>
              <Text style={styles.gameOpponent}>vs {opponent}</Text>
              <Text
                style={[
                  styles.gameResult,
                  {
                    color: draw
                      ? colors.textMuted
                      : userWon
                        ? colors.success
                        : colors.danger,
                  },
                ]}
              >
                {draw ? "=" : userWon ? "+" : "−"}
              </Text>
              <Text style={styles.gameMeta}>
                {item.timeClass ?? ""} · {relativeDate(item.playedAt)}
                {" · "}
                {item.analyzedAt ? "analysée" : "non analysée"}
              </Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

function relativeDate(ms: number): string {
  const diff = Date.now() - ms;
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "à l'instant";
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  user: { ...typography.heading, color: colors.text },
  puzzleCard: {
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    gap: spacing.md,
  },
  puzzleCount: { ...typography.heading, color: colors.text },
  syncRow: { padding: spacing.lg },
  empty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    padding: spacing.xl,
  },
  gameRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  gameOpponent: { ...typography.body, color: colors.text, fontWeight: "600" },
  gameResult: {
    ...typography.body,
    position: "absolute",
    right: spacing.lg,
    top: spacing.md,
  },
  gameMeta: { ...typography.caption, color: colors.textMuted },
});
