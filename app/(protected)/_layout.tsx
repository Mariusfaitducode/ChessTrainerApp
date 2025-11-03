import { Stack } from "expo-router";

export default function ProtectedLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="game/[id]"
        options={{
          headerShown: true,
          headerBackTitle: "Retour",
          presentation: "card",
        }}
      />
    </Stack>
  );
}
