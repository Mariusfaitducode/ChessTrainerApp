import { useEffect } from "react";
import { useRouter } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useOnboarding } from "@/hooks/useOnboarding";
import { colors } from "@/theme";

export default function OnboardingIndex() {
  const router = useRouter();
  const { isOnboardingCompleted, isLoading } = useOnboarding();

  useEffect(() => {
    if (isLoading) return;

    if (isOnboardingCompleted) {
      // Si l'onboarding est déjà complété, rediriger vers l'app
      router.replace("/(protected)/(tabs)/");
    } else {
      // Sinon, rediriger vers le premier écran d'onboarding
      router.replace("/(onboarding)/welcome");
    }
  }, [isOnboardingCompleted, isLoading, router]);

  // Afficher un loader pendant la vérification
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background.primary,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ActivityIndicator size="large" color={colors.orange[500]} />
    </View>
  );
}

