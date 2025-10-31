import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Chess Analyzer</Text>
          <Text style={styles.subtitle}>
            Analyse tes parties d&apos;échecs et améliore ton jeu
          </Text>
        </View>

        <View style={styles.illustration}>
          <Text style={styles.emoji}>♟️</Text>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/sign-up")}
          >
            <Text style={styles.primaryButtonText}>Créer un compte</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push("/sign-in")}
          >
            <Text style={styles.secondaryButtonText}>Se connecter</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Analyse tes parties de Lichess et Chess.com
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginTop: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
    lineHeight: 26,
    paddingHorizontal: 20,
  },
  illustration: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  emoji: {
    fontSize: 120,
  },
  buttons: {
    gap: 12,
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: "#2196F3",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    shadowColor: "#2196F3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#2196F3",
  },
  secondaryButtonText: {
    color: "#2196F3",
    fontSize: 18,
    fontWeight: "600",
  },
  footer: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});