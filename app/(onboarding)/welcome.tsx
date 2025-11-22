/**
 * Écran 1 : Bienvenue
 * Présente l'application et invite à commencer
 */

import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, typography, borders, shadows } from "@/theme";

export default function WelcomeOnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleNext = () => {
    router.push("/(onboarding)/platform");
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.emoji}>♟️</Text>
          <Text style={styles.title}>Bienvenue !</Text>
          <Text style={styles.subtitle}>
            Analyse tes parties d&apos;échecs et améliore ton jeu avec des
            exercices personnalisés
          </Text>
        </View>

        <View style={styles.illustration}>
          <Text style={styles.illustrationEmoji}>🎯</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>Commencer</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: spacing[10],
  },
  emoji: {
    fontSize: 80,
    marginBottom: spacing[6],
  },
  title: {
    fontSize: typography.fontSize["4xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing[4],
    textAlign: "center",
  },
  subtitle: {
    fontSize: typography.fontSize.lg,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: typography.fontSize.lg * typography.lineHeight.normal,
    paddingHorizontal: spacing[4],
  },
  illustration: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing[8],
  },
  illustrationEmoji: {
    fontSize: 120,
  },
  footer: {
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[8],
  },
  button: {
    backgroundColor: colors.orange[500],
    borderRadius: borders.radius.lg,
    padding: spacing[5],
    alignItems: "center",
    ...shadows.md,
  },
  buttonText: {
    color: colors.text.inverse,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
});

