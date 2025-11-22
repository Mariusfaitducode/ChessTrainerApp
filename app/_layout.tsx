import { useEffect } from "react";

import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";

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
    if (!isOnboardingCompleted) {
      if (!inOnboardingGroup && !inPublicGroup) {
        router.replace("/(onboarding)/");
      }
    } else {
      // Si l'onboarding est complété, cacher le splash screen
      SplashScreen.hide();
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
