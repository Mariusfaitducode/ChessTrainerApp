import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { getPlayer } from "@/services/chesscom";
import { useAppStore } from "@/stores/appStore";
import { Button } from "@/ui/Button";
import { openDb } from "@/db/db";
import { colors, spacing, typography, radius } from "@/theme";

export function UsernameScreen() {
  const router = useRouter();
  const setUsername = useAppStore((s) => s.setUsername);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const v = value.trim();
    if (v.length < 3) {
      setError("Pseudo trop court");
      return;
    }
    setLoading(true);
    try {
      const res = await getPlayer(v);
      if (!res.exists) {
        setError("Pseudo introuvable sur Chess.com");
        setLoading(false);
        return;
      }
      const db = await openDb();
      await setUsername(db, res.username);
      router.replace("/games");
    } catch {
      setError("Erreur réseau, réessaie");
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <Text style={styles.title}>ChessCorrect</Text>
        <Text style={styles.subtitle}>
          Entre ton pseudo Chess.com pour commencer
        </Text>

        <TextInput
          style={[styles.input, error && styles.inputError]}
          placeholder="ton_pseudo"
          autoCapitalize="none"
          autoCorrect={false}
          value={value}
          onChangeText={setValue}
          editable={!loading}
          onSubmitEditing={submit}
          returnKeyType="go"
        />
        {error && <Text style={styles.error}>{error}</Text>}

        <Button label="Commencer" onPress={submit} loading={loading} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: "center",
    gap: spacing.md,
  },
  title: { ...typography.title, color: colors.text, textAlign: "center" },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, ...typography.caption },
});
