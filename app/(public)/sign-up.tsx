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

import { useSignUp } from "@/hooks/useSignUp";
import { colors, spacing, typography, shadows, borders } from "@/theme";

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isLoaded, signUp, verifyOtp } = useSignUp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const onSignUpPress = async () => {
    if (!isLoaded) return;

    if (!email.trim()) {
      Alert.alert("Erreur", "Veuillez entrer votre email");
      return;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert("Erreur", "Veuillez entrer un email valide");
      return;
    }

    if (!password.trim()) {
      Alert.alert("Erreur", "Veuillez entrer un mot de passe");
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Erreur",
        "Le mot de passe doit contenir au moins 6 caractères",
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas");
      return;
    }

    setIsLoading(true);
    try {
      await signUp({
        email: email.trim(),
        password,
      });
      setPendingVerification(true);
    } catch (err: any) {
      console.error("Sign up error:", err);
      Alert.alert(
        "Erreur d'inscription",
        err?.message || "Une erreur est survenue lors de l'inscription",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded) return;

    if (!token.trim()) {
      Alert.alert("Erreur", "Veuillez entrer le code de vérification");
      return;
    }

    setIsLoading(true);
    try {
      await verifyOtp({
        email: email.trim(),
        token: token.trim(),
      });
    } catch (err: any) {
      console.error("Verify OTP error:", err);
      Alert.alert(
        "Erreur de vérification",
        err?.message || "Code de vérification incorrect",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (pendingVerification) {
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
          <Text style={styles.title}>Vérification</Text>
          <Text style={styles.subtitle}>
            Nous avons envoyé un code de vérification à {email}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Code de vérification</Text>
            <TextInput
              style={styles.input}
              value={token}
              placeholder="123456"
              placeholderTextColor={colors.text.tertiary}
              onChangeText={setToken}
              keyboardType="number-pad"
              maxLength={6}
              editable={!isLoading}
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              (!token || isLoading || !isLoaded) && styles.buttonDisabled,
            ]}
            onPress={onVerifyPress}
            disabled={!token || isLoading || !isLoaded}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <Text style={styles.buttonText}>Vérifier</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setPendingVerification(false)}
            disabled={isLoading}
          >
            <Text style={styles.backButtonText}>← Retour</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

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
        <Text style={styles.title}>Inscription</Text>
        <Text style={styles.subtitle}>
          Crée ton compte pour commencer à analyser tes parties
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
          <Text style={styles.hint}>Minimum 6 caractères</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirmer le mot de passe</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={confirmPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.text.tertiary}
              secureTextEntry={!showConfirmPassword}
              onChangeText={setConfirmPassword}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Text style={styles.eyeText}>
                {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            (!email ||
              !password ||
              !confirmPassword ||
              isLoading ||
              !isLoaded) &&
              styles.buttonDisabled,
          ]}
          onPress={onSignUpPress}
          disabled={
            !email || !password || !confirmPassword || isLoading || !isLoaded
          }
        >
          {isLoading ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <Text style={styles.buttonText}>Créer mon compte</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Déjà un compte ? </Text>
        <TouchableOpacity onPress={() => router.replace("/sign-in")}>
          <Text style={styles.footerLink}>Se connecter</Text>
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
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
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
  hint: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: -spacing[1],
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
  backButton: {
    marginTop: spacing[3],
    padding: spacing[3],
    alignItems: "center",
  },
  backButtonText: {
    color: colors.orange[500],
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
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
