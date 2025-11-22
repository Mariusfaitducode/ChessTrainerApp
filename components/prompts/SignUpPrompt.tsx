/**
 * Composant modal pour les prompts de création de compte
 * Affiche un prompt contextuel pour encourager la création de compte
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing, typography, borders, shadows } from "@/theme";

interface SignUpPromptProps {
  visible: boolean;
  onDismiss: () => void;
  type: "sync" | "exercise";
  count: number;
}

export const SignUpPrompt: React.FC<SignUpPromptProps> = ({
  visible,
  onDismiss,
  type,
  count,
}) => {
  const router = useRouter();

  const config = {
    sync: {
      emoji: "💾",
      title: `Vous avez synchronisé ${count} partie${count > 1 ? "s" : ""} !`,
      message:
        "Créez un compte pour les sauvegarder définitivement et les synchroniser entre vos appareils.",
    },
    exercise: {
      emoji: "📊",
      title: `Vous avez résolu ${count} exercice${count > 1 ? "s" : ""} !`,
      message:
        "Créez un compte pour suivre votre progression et accéder à vos statistiques détaillées.",
    },
  };

  const { emoji, title, message } = config[type];

  const handleSignUp = () => {
    onDismiss();
    router.push("/(public)/sign-up");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={onDismiss}
            >
              <Text style={styles.secondaryButtonText}>Plus tard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleSignUp}
            >
              <Text style={styles.primaryButtonText}>Créer un compte</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing[4],
  },
  container: {
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.xl,
    padding: spacing[6],
    width: "100%",
    maxWidth: 400,
    ...shadows.lg,
  },
  emoji: {
    fontSize: 64,
    textAlign: "center",
    marginBottom: spacing[4],
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: spacing[3],
  },
  message: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing[6],
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
  },
  buttons: {
    flexDirection: "row",
    gap: spacing[3],
  },
  button: {
    flex: 1,
    padding: spacing[4],
    borderRadius: borders.radius.md,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: colors.orange[500],
  },
  primaryButtonText: {
    color: colors.text.inverse,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  secondaryButton: {
    backgroundColor: colors.background.tertiary,
  },
  secondaryButtonText: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});

