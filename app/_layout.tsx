import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { openDb } from "@/db/db";
import { useAppStore } from "@/stores/appStore";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const loadFromDb = useAppStore((s) => s.loadFromDb);

  useEffect(() => {
    (async () => {
      const db = await openDb();
      await loadFromDb(db);
      setReady(true);
      await SplashScreen.hideAsync().catch(() => {});
    })();
  }, [loadFromDb]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
