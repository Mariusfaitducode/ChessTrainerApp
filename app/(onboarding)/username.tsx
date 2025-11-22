/**
 * Écran 3 : Saisie du pseudo
 * L'utilisateur entre son username pour la plateforme choisie
 */

import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Check } from "lucide-react-native";
import { useChessPlatform } from "@/hooks/useChessPlatform";
import { useOnboarding } from "@/hooks/useOnboarding";
import type { Platform } from "@/types/chess";
import { colors, spacing, typography, borders, shadows } from "@/theme";

export default function UsernameOnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { platform } = useLocalSearchParams<{ platform: Platform }>();
  const { addPlatform, isAdding } = useChessPlatform();
  const { completeOnboarding } = useOnboarding();

  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleSubmit = async () => {
    if (!username.trim()) {
      Alert.alert("Erreur", "Veuillez entrer un nom d'utilisateur");
      return;
    }

    if (!platform) {
      Alert.alert("Erreur", "Plateforme non sélectionnée");
      return;
    }

    setIsSubmitting(true);

    try {
      // Ajouter la plateforme
      await addPlatform({
        platform,
        username: username.trim(),
      });

      // Marquer l'onboarding comme complété
      await completeOnboarding();

      // Petit délai pour s'assurer que l'état est bien mis à jour
      // avant de naviguer (évite les conflits de navigation)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Rediriger vers l'app (dashboard)
      router.replace("/(protected)/(tabs)/");
    } catch (error: any) {
      Alert.alert(
        "Erreur",
        error?.message ||
          "Impossible d'ajouter ce username. Vérifiez qu'il existe sur la plateforme.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const platformName = platform === "lichess" ? "Lichess" : "Chess.com";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Quel est ton pseudo ?</Text>
          <Text style={styles.subtitle}>
            Entre ton nom d&apos;utilisateur {platformName} pour synchroniser tes
            parties
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Nom d&apos;utilisateur {platformName}</Text>
          <TextInput
            style={styles.input}
            placeholder="ton_pseudo"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            editable={!isSubmitting}
          />
          <Text style={styles.inputHint}>
            Ce pseudo sera utilisé pour récupérer tes parties depuis{" "}
            {platformName}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerButton, styles.backButton]}
          onPress={handleBack}
          disabled={isSubmitting}
        >
          <ArrowLeft size={20} color={colors.text.secondary} />
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.footerButton,
            styles.submitButton,
            (!username.trim() || isSubmitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!username.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.text.inverse} size="small" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Terminer</Text>
              <Check size={20} color={colors.text.inverse} />
            </>
          )}
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
  inputContainer: {
    marginTop: spacing[6],
  },
  inputLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  input: {
    backgroundColor: colors.background.secondary,
    borderWidth: borders.width.thin,
    borderColor: colors.border.light,
    borderRadius: borders.radius.lg,
    padding: spacing[4],
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    marginBottom: spacing[2],
    ...shadows.sm,
  },
  inputHint: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
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
  submitButton: {
    backgroundColor: colors.orange[500],
    ...shadows.md,
  },
  submitButtonDisabled: {
    backgroundColor: colors.background.tertiary,
    ...shadows.none,
  },
  submitButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.inverse,
  },
});

