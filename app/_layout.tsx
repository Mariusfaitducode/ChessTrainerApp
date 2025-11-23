import { useEffect } from "react";

import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  useFonts,
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from "@expo-google-fonts/fredoka";
import { PatrickHand_400Regular } from "@expo-google-fonts/patrick-hand";

import { useSupabase } from "@/hooks/useSupabase";
import { useOnboarding } from "@/hooks/useOnboarding";
import { QueryProvider } from "@/providers/query-provider";
import { SupabaseProvider } from "@/providers/supabase-provider";

SplashScreen.setOptions({
  duration: 500,
  fade: true,
});

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fredoka_400Regular,
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    PatrickHand_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) {
      console.log("Fonts loaded successfully!");
      // On laisse le RootNavigator gérer le hide du splash screen
      // une fois que l'auth est chargée aussi
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SupabaseProvider>
        <QueryProvider>
          <RootNavigator />
        </QueryProvider>
      </SupabaseProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { isLoaded, session } = useSupabase();
  const { isOnboardingCompleted, isLoading: isOnboardingLoading } =
    useOnboarding();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!isLoaded || isOnboardingLoading) {
      return;
    }

    const inOnboardingGroup = segments[0] === "(onboarding)";
    const inProtectedGroup = segments[0] === "(protected)";
    const inPublicGroup = segments[0] === "(public)";

    // Si l'onboarding n'est pas complété, rediriger vers l'onboarding
    // MAIS seulement si on n'est pas déjà dans le groupe protected (pour éviter les conflits)
    if (!isOnboardingCompleted) {
      if (!inOnboardingGroup && !inPublicGroup && !inProtectedGroup) {
        router.replace("/(onboarding)/");
      }
    } else {
      // Si l'onboarding est complété, cacher le splash screen
      SplashScreen.hide();
      
      // Si on est dans l'onboarding mais que c'est complété, rediriger vers l'app
      if (inOnboardingGroup) {
        router.replace("/(protected)/(tabs)/");
      }
    }
  }, [isLoaded, isOnboardingCompleted, isOnboardingLoading, segments, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animation: "none",
        animationDuration: 0,
      }}
    >
      {/* Onboarding - accessible uniquement si pas complété */}
      <Stack.Screen name="(onboarding)" />

      {/* Toujours accessible, même sans session (mode guest) */}
      <Stack.Screen name="(protected)" />

      {/* Seulement accessible si pas de session (pages d'auth) */}
      {!session && <Stack.Screen name="(public)" />}
    </Stack>
  );
}
