import { useState } from "react";
import {
  Text,
  TextInput,
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSignIn } from "@/hooks/useSignIn";
import { colors, spacing, typography, shadows, borders } from "@/theme";

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signInWithPassword, isLoaded } = useSignIn();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSignInPress = async () => {
    if (!isLoaded) return;

    if (!email.trim()) {
      Alert.alert("Erreur", "Veuillez entrer votre email");
      return;
    }

    if (!password.trim()) {
      Alert.alert("Erreur", "Veuillez entrer votre mot de passe");
      return;
    }

    setIsLoading(true);
    try {
      await signInWithPassword({
        email: email.trim(),
        password,
      });
    } catch (err: any) {
      console.error("Sign in error:", err);
      Alert.alert(
        "Erreur de connexion",
        err?.message || "Email ou mot de passe incorrect"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing[5] },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>Connexion</Text>
        <Text style={styles.subtitle}>
          Connecte-toi pour analyser tes parties
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            placeholder="ton@email.com"
            placeholderTextColor={colors.text.tertiary}
            onChangeText={setEmail}
            editable={!isLoading}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mot de passe</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              placeholder="••••••••"
              placeholderTextColor={colors.text.tertiary}
              secureTextEntry={!showPassword}
              onChangeText={setPassword}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.eyeText}>{showPassword ? "👁️" : "👁️‍🗨️"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            (!email || !password || isLoading || !isLoaded) &&
              styles.buttonDisabled,
          ]}
          onPress={onSignInPress}
          disabled={!email || !password || isLoading || !isLoaded}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <Text style={styles.buttonText}>Se connecter</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Pas encore de compte ? </Text>
        <TouchableOpacity onPress={() => router.replace("/sign-up")}>
          <Text style={styles.footerLink}>S&apos;inscrire</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[10],
  },
  header: {
    marginBottom: spacing[10],
  },
  title: {
    fontSize: typography.fontSize["3xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  form: {
    gap: spacing[6],
    marginBottom: spacing[8],
  },
  inputGroup: {
    gap: spacing[2],
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  input: {
    borderWidth: borders.width.thin,
    borderColor: colors.border.light,
    borderRadius: borders.radius.lg,
    padding: spacing[4],
    fontSize: typography.fontSize.base,
    backgroundColor: colors.background.secondary,
    color: colors.text.primary,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: borders.width.thin,
    borderColor: colors.border.light,
    borderRadius: borders.radius.lg,
    backgroundColor: colors.background.secondary,
  },
  passwordInput: {
    flex: 1,
    padding: spacing[4],
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  eyeButton: {
    padding: spacing[4],
  },
  eyeText: {
    fontSize: typography.fontSize.xl,
  },
  button: {
    backgroundColor: colors.orange[500],
    borderRadius: borders.radius.lg,
    padding: spacing[5],
    alignItems: "center",
    marginTop: spacing[2],
    ...shadows.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.text.inverse,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing[5],
  },
  footerText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  footerLink: {
    fontSize: typography.fontSize.sm,
    color: colors.orange[500],
    fontWeight: typography.fontWeight.semibold,
  },
});