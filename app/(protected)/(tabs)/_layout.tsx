import { Stack } from "expo-router";
import { View, StyleSheet } from "react-native";

import { TabBar } from "@/components/navigation/TabBar";
import { colors } from "@/theme";

export default function TabsLayout() {
  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="games" />
        <Stack.Screen name="exercises" />
        <Stack.Screen name="profile" />
      </Stack>
      <TabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
});
