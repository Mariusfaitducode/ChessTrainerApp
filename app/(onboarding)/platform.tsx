/**
 * Écran 2 : Sélection de la plateforme
 * Style "Sketch & Play" - Maquette 2
 */

import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowRight } from "lucide-react-native";
import type { Platform } from "@/types/chess";
import { colors, spacing, typography, borders, shadows } from "@/theme";

export default function PlatformOnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(
    null,
  );

  const handleNext = () => {
    if (!selectedPlatform) return;
    router.push({
      pathname: "/(onboarding)/username",
      params: { platform: selectedPlatform },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {/* Illustration Cavalier */}
        <View style={styles.illustrationContainer}>
          <Text style={styles.knightEmoji}>♞</Text>
        </View>

        {/* Titre */}
        <View style={styles.header}>
          <Text style={styles.title}>Où joues-tu</Text>
          <Text style={styles.title}>aux échecs ?</Text>
        </View>

        {/* Choix Plateforme (Boutons Rectangles) */}
        <View style={styles.platforms}>
          <TouchableOpacity
            style={[
              styles.platformButton,
              selectedPlatform === "chesscom" && styles.platformButtonSelected,
            ]}
            onPress={() => setSelectedPlatform("chesscom")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.platformButtonText,
                selectedPlatform === "chesscom" &&
                  styles.platformButtonTextSelected,
              ]}
            >
              Chess
            </Text>
            {selectedPlatform === "chesscom" && (
              <View style={styles.checkIcon}>
                <Text style={{ fontSize: 20 }}>✓</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.platformButton,
              selectedPlatform === "lichess" && styles.platformButtonSelected,
            ]}
            onPress={() => setSelectedPlatform("lichess")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.platformButtonText,
                selectedPlatform === "lichess" &&
                  styles.platformButtonTextSelected,
              ]}
            >
              LiChess
            </Text>
            {selectedPlatform === "lichess" && (
              <View style={styles.checkIcon}>
                <Text style={{ fontSize: 20 }}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer avec bouton Flèche */}
      <View style={styles.footer}>
        {selectedPlatform && (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <ArrowRight size={32} color={colors.text.primary} strokeWidth={2} />
          </TouchableOpacity>
        )}
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
    paddingTop: spacing[8],
  },
  illustrationContainer: {
    marginBottom: spacing[6],
  },
  knightEmoji: {
    fontSize: 80,
  },
  header: {
    marginBottom: spacing[12],
    alignItems: "center",
  },
  title: {
    fontFamily: typography.fontFamily.body,
    fontSize: 32,
    color: colors.text.primary,
    textAlign: "center",
    lineHeight: 40,
  },
  platforms: {
    width: "100%",
    gap: spacing[4],
    maxWidth: 300,
  },
  platformButton: {
    flexDirection: "row", // Pour aligner le check
    backgroundColor: colors.background.primary,
    borderRadius: borders.radius.md,
    borderWidth: borders.width.medium, // 2px
    borderColor: colors.border.medium,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  platformButtonSelected: {
    backgroundColor: colors.background.tertiary, // Gris très clair subtil
    borderColor: colors.text.primary, // Noir
  },
  platformButtonText: {
    fontFamily: typography.fontFamily.body,
    fontSize: 24,
    color: colors.text.primary,
    flex: 1, // Pour centrer le texte même avec l'icône
    textAlign: "center",
    marginLeft: 20, // Compenser l'icône pour le centrage visuel
  },
  platformButtonTextSelected: {
    color: colors.text.primary, // Reste noir
    fontWeight: "bold",
  },
  checkIcon: {
    width: 20, // Espace fixe pour l'icône
  },
  footer: {
    padding: spacing[6],
    alignItems: "flex-end",
    height: 120,
  },
  nextButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: borders.width.medium,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
});
