import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSupabase } from "@/hooks/useSupabase";
import { useChessPlatform } from "@/hooks/useChessPlatform";
import type { Platform } from "@/types/chess";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { session, signOut } = useSupabase();
  const { addPlatform, disconnectPlatform, isAdding, getPlatform } =
    useChessPlatform();

  const [showAddModal, setShowAddModal] = useState<Platform | null>(null);
  const [usernameInput, setUsernameInput] = useState("");

  const handleAddPlatform = async (platform: Platform) => {
    if (!usernameInput.trim()) {
      Alert.alert("Erreur", "Veuillez entrer un nom d'utilisateur");
      return;
    }

    try {
      await addPlatform({
        platform,
        username: usernameInput.trim(),
      });
      Alert.alert("Succès", `Username ${platform} ajouté !`);
      setShowAddModal(null);
      setUsernameInput("");
    } catch (error: any) {
      Alert.alert("Erreur", error?.message || `Échec de l'ajout`);
    }
  };

  const handleDisconnect = async (platformId: string, platformName: string) => {
    Alert.alert(
      "Déconnexion",
      `Voulez-vous vraiment déconnecter ${platformName} ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Déconnecter",
          style: "destructive",
          onPress: async () => {
            try {
              await disconnectPlatform(platformId);
              Alert.alert("Succès", "Plateforme déconnectée");
            } catch (error: any) {
              Alert.alert(
                "Erreur",
                error?.message || "Échec de la déconnexion",
              );
            }
          },
        },
      ],
    );
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const lichessPlatform = getPlatform("lichess");
  const chesscomPlatform = getPlatform("chesscom");

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Profil</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compte</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{session?.user?.email}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Plateformes</Text>

        {/* Lichess */}
        <View style={styles.platformCard}>
          <View style={styles.platformHeader}>
            <Text style={styles.platformName}>Lichess</Text>
            {lichessPlatform && (
              <View style={styles.connectedBadge}>
                <Text style={styles.connectedText}>✓ Connecté</Text>
              </View>
            )}
          </View>
          {lichessPlatform ? (
            <View style={styles.platformInfo}>
              <Text style={styles.platformUsername}>
                {lichessPlatform.platform_username}
              </Text>
              <TouchableOpacity
                style={styles.disconnectButton}
                onPress={() => handleDisconnect(lichessPlatform.id, "Lichess")}
                disabled={isAdding}
              >
                <Text style={styles.disconnectButtonText}>Déconnecter</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.connectButton}
              onPress={() => setShowAddModal("lichess")}
              disabled={isAdding}
            >
              <Text style={styles.connectButtonText}>Ajouter un username</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Chess.com */}
        <View style={[styles.platformCard, { marginTop: 12 }]}>
          <View style={styles.platformHeader}>
            <Text style={styles.platformName}>Chess.com</Text>
            {chesscomPlatform && (
              <View style={styles.connectedBadge}>
                <Text style={styles.connectedText}>✓ Connecté</Text>
              </View>
            )}
          </View>
          {chesscomPlatform ? (
            <View style={styles.platformInfo}>
              <Text style={styles.platformUsername}>
                {chesscomPlatform.platform_username}
              </Text>
              <TouchableOpacity
                style={styles.disconnectButton}
                onPress={() =>
                  handleDisconnect(chesscomPlatform.id, "Chess.com")
                }
                disabled={isAdding}
              >
                <Text style={styles.disconnectButtonText}>Déconnecter</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.connectButton}
              onPress={() => setShowAddModal("chesscom")}
              disabled={isAdding}
            >
              <Text style={styles.connectButtonText}>Ajouter un username</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      {/* Modal pour ajouter un username */}
      <Modal
        visible={showAddModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowAddModal(null);
          setUsernameInput("");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Ajouter un username{" "}
              {showAddModal === "lichess" ? "Lichess" : "Chess.com"}
            </Text>
            <Text style={styles.modalSubtitle}>
              Entrez le nom d&apos;utilisateur que vous souhaitez analyser
            </Text>
            <TextInput
              style={styles.usernameInput}
              placeholder="nom_utilisateur"
              value={usernameInput}
              onChangeText={setUsernameInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowAddModal(null);
                  setUsernameInput("");
                }}
              >
                <Text style={styles.modalButtonCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={() => showAddModal && handleAddPlatform(showAddModal)}
                disabled={!usernameInput.trim() || isAdding}
              >
                {isAdding ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonConfirmText}>Ajouter</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 24,
    color: "#000",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 12,
    color: "#000",
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 16,
    color: "#000",
    fontWeight: "500",
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 12,
    color: "#999",
    lineHeight: 18,
  },
  signOutButton: {
    backgroundColor: "#f44336",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  signOutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  platformCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  platformHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  platformName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  connectedBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  connectedText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  platformInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  platformUsername: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  connectButton: {
    backgroundColor: "#2196F3",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  connectButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  disconnectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  disconnectButtonText: {
    color: "#f44336",
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: "50%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#000",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  usernameInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: "#f9f9f9",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: "#f0f0f0",
  },
  modalButtonCancelText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  modalButtonConfirm: {
    backgroundColor: "#2196F3",
  },
  modalButtonConfirmText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
