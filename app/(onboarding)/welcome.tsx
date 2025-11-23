/**
 * Écran 1 : Bienvenue
 * Style "Sketch & Play"
 */

import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowRight } from "lucide-react-native";
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
        {/* Logo / Illustration */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>♟️</Text>
        </View>

        {/* Titres */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>ChessCorrect</Text>
          <Text style={styles.subtitle}>Bienvenue sur ChessCorrect !</Text>
        </View>

        {/* Illustration secondaire (Pion) */}
        <View style={styles.illustrationContainer}>
           <Text style={styles.pawnEmoji}>♟</Text>
        </View>
      </View>

      {/* Footer avec bouton Flèche */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.nextButton} 
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <ArrowRight size={32} color={colors.text.primary} strokeWidth={3} />
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
    alignItems: "center",
    paddingHorizontal: spacing[6],
    paddingTop: spacing[12],
  },
  logoContainer: {
    marginBottom: spacing[4],
  },
  logoEmoji: {
    fontSize: 80,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: spacing[12],
  },
  title: {
    fontFamily: typography.fontFamily.display,
    fontSize: 42,
    color: colors.text.primary,
    marginBottom: spacing[2],
    textAlign: "center",
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xl,
    color: colors.text.primary,
    textAlign: "center",
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  pawnEmoji: {
    fontSize: 120,
    transform: [{ rotate: "-10deg" }], // Petit côté ludique
  },
  footer: {
    padding: spacing[6],
    alignItems: "flex-end", // Bouton à droite
  },
  nextButton: {
    width: 64,
    height: 64,
    borderRadius: 32, // Cercle parfait
    borderWidth: borders.width.medium,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm, // Ombre dure
  },
});

