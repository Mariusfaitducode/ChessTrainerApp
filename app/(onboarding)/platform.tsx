/**
 * Écran 2 : Sélection de la plateforme
 * L'utilisateur choisit entre Lichess et Chess.com
 */

import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, ArrowRight } from "lucide-react-native";
import type { Platform } from "@/types/chess";
import { colors, spacing, typography, borders, shadows } from "@/theme";

export default function PlatformOnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(
    null,
  );

  const handleBack = () => {
    router.back();
  };

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
        <View style={styles.header}>
          <Text style={styles.title}>Quelle plateforme utilises-tu ?</Text>
          <Text style={styles.subtitle}>
            Choisis la plateforme où tu joues tes parties
          </Text>
        </View>

        <View style={styles.platforms}>
          <TouchableOpacity
            style={[
              styles.platformCard,
              selectedPlatform === "lichess" && styles.platformCardSelected,
            ]}
            onPress={() => setSelectedPlatform("lichess")}
            activeOpacity={0.7}
          >
            <Text style={styles.platformEmoji}>♛</Text>
            <Text style={styles.platformName}>Lichess</Text>
            <Text style={styles.platformDescription}>
              Plateforme open-source gratuite
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.platformCard,
              selectedPlatform === "chesscom" && styles.platformCardSelected,
            ]}
            onPress={() => setSelectedPlatform("chesscom")}
            activeOpacity={0.7}
          >
            <Text style={styles.platformEmoji}>♚</Text>
            <Text style={styles.platformName}>Chess.com</Text>
            <Text style={styles.platformDescription}>
              La plus grande communauté d&apos;échecs
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerButton, styles.backButton]}
          onPress={handleBack}
        >
          <ArrowLeft size={20} color={colors.text.secondary} />
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.footerButton,
            styles.nextButton,
            !selectedPlatform && styles.nextButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!selectedPlatform}
        >
          <Text
            style={[
              styles.nextButtonText,
              !selectedPlatform && styles.nextButtonTextDisabled,
            ]}
          >
            Suivant
          </Text>
          <ArrowRight
            size={20}
            color={
              selectedPlatform
                ? colors.text.inverse
                : colors.text.disabled
            }
          />
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
    paddingTop: spacing[8],
  },
  header: {
    marginBottom: spacing[10],
  },
  title: {
    fontSize: typography.fontSize["3xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing[3],
    textAlign: "center",
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
  },
  platforms: {
    gap: spacing[4],
  },
  platformCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.xl,
    padding: spacing[6],
    alignItems: "center",
    borderWidth: borders.width.medium,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  platformCardSelected: {
    borderColor: colors.orange[500],
    borderWidth: borders.width.thick,
    backgroundColor: colors.orange[50],
  },
  platformEmoji: {
    fontSize: 64,
    marginBottom: spacing[3],
  },
  platformName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  platformDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[8],
    gap: spacing[3],
  },
  footerButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing[4],
    borderRadius: borders.radius.lg,
    gap: spacing[2],
  },
  backButton: {
    backgroundColor: colors.background.secondary,
    borderWidth: borders.width.thin,
    borderColor: colors.border.medium,
  },
  backButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
  },
  nextButton: {
    backgroundColor: colors.orange[500],
    ...shadows.md,
  },
  nextButtonDisabled: {
    backgroundColor: colors.background.tertiary,
    ...shadows.none,
  },
  nextButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.inverse,
  },
  nextButtonTextDisabled: {
    color: colors.text.disabled,
  },
});

