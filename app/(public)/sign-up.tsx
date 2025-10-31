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
      Alert.alert("Erreur", "Le mot de passe doit contenir au moins 6 caractères");
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
        err?.message || "Une erreur est survenue lors de l'inscription"
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
      // La navigation se fera automatiquement via useSupabase qui détecte la session
    } catch (err: any) {
      console.error("Verify OTP error:", err);
      Alert.alert(
        "Erreur de vérification",
        err?.message || "Code de vérification incorrect"
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
          { paddingTop: insets.top + 20 },
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
              placeholderTextColor="#999"
              onChangeText={setToken}
              keyboardType="number-pad"
              maxLength={6}
              editable={!isLoading}
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={onVerifyPress}
            disabled={!token || isLoading || !isLoaded}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
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
        { paddingTop: insets.top + 20 },
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
            placeholderTextColor="#999"
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
              placeholderTextColor="#999"
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
          <Text style={styles.hint}>
            Minimum 6 caractères
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirmer le mot de passe</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={confirmPassword}
              placeholder="••••••••"
              placeholderTextColor="#999"
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
            isLoading && styles.buttonDisabled,
            (!email || !password || !confirmPassword) && styles.buttonDisabled,
          ]}
          onPress={onSignUpPress}
          disabled={
            !email ||
            !password ||
            !confirmPassword ||
            isLoading ||
            !isLoaded
          }
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
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
    backgroundColor: "#fff",
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    lineHeight: 22,
  },
  form: {
    gap: 24,
    marginBottom: 32,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    backgroundColor: "#f9f9f9",
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
  },
  eyeButton: {
    padding: 16,
  },
  eyeText: {
    fontSize: 20,
  },
  hint: {
    fontSize: 12,
    color: "#999",
    marginTop: -4,
  },
  button: {
    backgroundColor: "#2196F3",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#2196F3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  backButton: {
    marginTop: 12,
    padding: 12,
    alignItems: "center",
  },
  backButtonText: {
    color: "#2196F3",
    fontSize: 16,
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: "#666",
  },
  footerLink: {
    fontSize: 14,
    color: "#2196F3",
    fontWeight: "600",
  },
});