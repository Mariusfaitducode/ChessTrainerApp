import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing, typography, shadows, borders } from "@/theme";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Chess Analyzer</Text>
          <Text style={styles.subtitle}>
            Analyse tes parties d&apos;échecs et améliore ton jeu
          </Text>
        </View>

        <View style={styles.illustration}>
          <Text style={styles.emoji}>♟️</Text>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/sign-up")}
          >
            <Text style={styles.primaryButtonText}>Créer un compte</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push("/sign-in")}
          >
            <Text style={styles.secondaryButtonText}>Se connecter</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Analyse tes parties de Lichess et Chess.com
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[6],
    justifyContent: "space-between",
    paddingTop: spacing[16],
    paddingBottom: spacing[10],
  },
  header: {
    alignItems: "center",
    marginTop: spacing[10],
  },
  title: {
    fontSize: typography.fontSize["4xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing[3],
    textAlign: "center",
  },
  subtitle: {
    fontSize: typography.fontSize.lg,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: typography.fontSize.lg * typography.lineHeight.normal,
    paddingHorizontal: spacing[5],
  },
  illustration: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  emoji: {
    fontSize: 120,
  },
  buttons: {
    gap: spacing[3],
    marginBottom: spacing[5],
  },
  primaryButton: {
    backgroundColor: colors.orange[500],
    borderRadius: borders.radius.lg,
    padding: spacing[5],
    alignItems: "center",
    ...shadows.md,
  },
  primaryButtonText: {
    color: colors.text.inverse,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  secondaryButton: {
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.lg,
    padding: spacing[5],
    alignItems: "center",
    borderWidth: borders.width.thin,
    borderColor: colors.border.medium,
  },
  secondaryButtonText: {
    color: colors.orange[500],
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  footer: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    textAlign: "center",
  },
});