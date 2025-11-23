/**
 * Écran 3 : Saisie du pseudo
 * Style "Sketch & Play" - Maquette 1
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
import { ArrowRight } from "lucide-react-native";
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

  const handleSubmit = async () => {
    if (!username.trim()) {
      Alert.alert("Oups !", "Il manque ton pseudo !");
      return;
    }

    if (!platform) {
      Alert.alert("Oups !", "Plateforme non sélectionnée");
      return;
    }

    setIsSubmitting(true);

    try {
      await addPlatform({
        platform,
        username: username.trim(),
      });

      await completeOnboarding();
      await new Promise((resolve) => setTimeout(resolve, 100));
      router.replace("/(protected)/(tabs)/");
    } catch (error: any) {
      Alert.alert(
        "Introuvable",
        "Impossible de trouver ce joueur. Vérifie ton pseudo !",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        
        {/* Titre */}
        <View style={styles.header}>
          <Text style={styles.title}>Quel est votre</Text>
          <Text style={styles.title}>pseudo ?</Text>
        </View>

        {/* Input Style "Marker" */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="ton_pseudo"
            placeholderTextColor={colors.text.tertiary}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            editable={!isSubmitting}
          />
        </View>
        
        {/* Illustration Fou (Bishop) */}
        <View style={styles.illustrationContainer}>
           <Text style={styles.bishopEmoji}>♝</Text>
        </View>

      </View>

        {/* Footer avec bouton Flèche */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              (!username.trim() || isSubmitting) && styles.nextButtonDisabled,
            ]}
          onPress={handleSubmit}
          disabled={!username.trim() || isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.text.primary} size="small" />
          ) : (
             <ArrowRight size={32} color={colors.text.primary} strokeWidth={3} />
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
    paddingTop: spacing[12],
  },
  header: {
    marginBottom: spacing[8],
    alignItems: "center",
  },
  title: {
    fontFamily: typography.fontFamily.body,
    fontSize: 32,
    color: colors.text.primary,
    textAlign: "center",
    lineHeight: 40,
  },
  inputContainer: {
    marginBottom: spacing[8],
  },
  input: {
    backgroundColor: colors.background.primary,
    borderWidth: borders.width.medium, // 3px
    borderColor: colors.border.medium,
    borderRadius: borders.radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: 24,
    fontFamily: typography.fontFamily.body,
    color: colors.text.primary,
    textAlign: "center",
    ...shadows.sm,
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: "center",
    marginLeft: spacing[4], // Décalé un peu à gauche comme sur la maquette
  },
  bishopEmoji: {
    fontSize: 80,
    transform: [{ rotate: "15deg" }],
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
  nextButtonDisabled: {
    opacity: 0.5,
    borderColor: colors.text.disabled,
    ...shadows.none,
  },
});

