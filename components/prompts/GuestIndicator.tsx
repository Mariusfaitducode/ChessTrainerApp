/**
 * Indicateur discret du mode guest
 * Affiche un bandeau discret en haut de l'app avec un lien vers la création de compte
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useGuestMode } from "@/hooks/useGuestMode";
import { colors, spacing, typography, borders } from "@/theme";

export const GuestIndicator: React.FC = () => {
  const { isGuest } = useGuestMode();
  const router = useRouter();

  if (!isGuest) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Mode invité</Text>
      <TouchableOpacity
        onPress={() => router.push("/(public)/sign-up")}
        style={styles.link}
      >
        <Text style={styles.linkText}>Créer un compte</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  text: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  link: {},
  linkText: {
    fontSize: typography.fontSize.xs,
    color: colors.orange[500],
    fontWeight: typography.fontWeight.semibold,
  },
});

