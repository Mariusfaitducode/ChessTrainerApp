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

import { useRouter } from "expo-router";
import { useSupabase } from "@/hooks/useSupabase";
import { useChessPlatform } from "@/hooks/useChessPlatform";
import { useGuestMode } from "@/hooks/useGuestMode";
import type { Platform } from "@/types/chess";
import { colors, spacing, typography, shadows, borders } from "@/theme";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, signOut } = useSupabase();
  const { isGuest } = useGuestMode();
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

      {!isGuest && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compte</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{session?.user?.email}</Text>
          </View>
        </View>
      )}

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
        <View style={[styles.platformCard, { marginTop: spacing[3] }]}>
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

      {!isGuest && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutText}>Déconnexion</Text>
          </TouchableOpacity>
        </View>
      )}

      {isGuest && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.signUpButton}
            onPress={() => router.push("/(public)/sign-up")}
          >
            <Text style={styles.signUpText}>Créer un compte</Text>
          </TouchableOpacity>
        </View>
      )}

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
                  <ActivityIndicator color={colors.text.inverse} />
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
    backgroundColor: colors.background.primary,
  },
  content: {
    padding: spacing[4],
  },
  title: {
    fontFamily: typography.fontFamily.display, // Patrick Hand
    fontSize: 32,
    color: colors.text.primary,
    marginBottom: spacing[6],
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[4],
    letterSpacing: -0.5,
  },
  infoCard: {
    backgroundColor: colors.background.primary,
    borderRadius: borders.radius.xl,
    padding: spacing[5],
    borderWidth: borders.width.thin,
    borderColor: colors.border.medium,
    ...shadows.sm,
  },
  infoLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginBottom: spacing[1],
    textTransform: "uppercase",
    fontFamily: typography.fontFamily.body,
    fontWeight: typography.fontWeight.medium,
    letterSpacing: 1,
  },
  infoValue: {
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: "500",
    fontFamily: typography.fontFamily.body,
  },
  signOutButton: {
    backgroundColor: colors.background.primary,
    borderRadius: borders.radius.xl,
    borderWidth: borders.width.thin,
    borderColor: colors.error.main,
    padding: spacing[4],
    alignItems: "center",
    ...shadows.sm,
  },
  signOutText: {
    color: colors.error.main,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamily.body,
  },
  signUpButton: {
    backgroundColor: colors.text.primary,
    borderRadius: borders.radius.xl,
    padding: spacing[4],
    alignItems: "center",
    ...shadows.sm,
  },
  signUpText: {
    color: colors.text.inverse,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamily.body,
  },
  platformCard: {
    backgroundColor: colors.background.primary,
    borderRadius: borders.radius.xl,
    padding: spacing[5],
    borderWidth: borders.width.thin,
    borderColor: colors.border.medium,
    ...shadows.sm,
  },
  platformHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[3],
  },
  platformName: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.body,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  connectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.success.light,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borders.radius.full,
    borderWidth: 1,
    borderColor: colors.success.main,
  },
  connectedText: {
    color: colors.success.dark,
    fontSize: 12,
    fontWeight: "600",
    fontFamily: typography.fontFamily.body,
  },
  platformInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  platformUsername: {
    fontSize: 16,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.body,
  },
  connectButton: {
    backgroundColor: colors.background.primary,
    borderRadius: borders.radius.md,
    padding: spacing[3],
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    borderWidth: borders.width.thin,
    borderColor: colors.text.primary,
    borderStyle: "dashed", // Style pour "Ajouter"
  },
  connectButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: typography.fontFamily.body,
  },
  disconnectButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  disconnectButtonText: {
    color: colors.error.main,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: typography.fontFamily.body,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: spacing[6],
    borderTopRightRadius: spacing[6],
    padding: spacing[6],
    maxHeight: "50%",
    borderTopWidth: borders.width.medium,
    borderColor: colors.border.medium,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: typography.fontFamily.heading,
    marginBottom: spacing[2],
    color: colors.text.primary,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing[4],
    fontFamily: typography.fontFamily.body,
  },
  usernameInput: {
    borderWidth: borders.width.medium,
    borderColor: colors.border.medium,
    borderRadius: borders.radius.md,
    padding: spacing[3],
    fontSize: 16,
    marginBottom: spacing[4],
    backgroundColor: colors.background.primary,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.body,
  },
  modalButtons: {
    flexDirection: "row",
    gap: spacing[3],
  },
  modalButton: {
    flex: 1,
    padding: spacing[4],
    borderRadius: borders.radius.md,
    alignItems: "center",
    borderWidth: borders.width.thin,
    borderColor: colors.border.medium,
  },
  modalButtonCancel: {
    backgroundColor: colors.background.primary,
  },
  modalButtonCancelText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: typography.fontFamily.body,
  },
  modalButtonConfirm: {
    backgroundColor: colors.text.primary, // Noir
  },
  modalButtonConfirmText: {
    color: colors.text.inverse, // Blanc
    fontSize: 16,
    fontWeight: "600",
    fontFamily: typography.fontFamily.body,
  },
});
