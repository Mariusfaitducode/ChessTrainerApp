import { Stack } from "expo-router";

export default function PublicLayout() {
  return (
    <Stack initialRouteName="welcome">
      <Stack.Screen
        name="welcome"
        options={{
          title: "Welcome",
          headerTransparent: true,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="sign-up"
        options={{
          title: "Sign Up",
          headerTransparent: true,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="sign-in"
        options={{
          title: "Sign In",
          headerTransparent: true,
          headerShown: false,
        }}
      />
    </Stack>
  );
}
