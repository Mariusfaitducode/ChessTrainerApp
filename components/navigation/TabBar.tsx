import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useSegments, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LayoutDashboard, Grid3x3, Brain, User } from "lucide-react-native";

import { colors, spacing, typography, shadows, borders } from "@/theme";

interface TabItem {
  name: string;
  label: string;
  route: string;
  icon: typeof LayoutDashboard;
}

const tabs: TabItem[] = [
  {
    name: "index",
    label: "Dashboard",
    route: "/(protected)/(tabs)/",
    icon: LayoutDashboard,
  },
  {
    name: "games",
    label: "Parties",
    route: "/(protected)/(tabs)/games",
    icon: Grid3x3,
  },
  {
    name: "exercises",
    label: "Exercices",
    route: "/(protected)/(tabs)/exercises",
    icon: Brain,
  },
  {
    name: "profile",
    label: "Profil",
    route: "/(protected)/(tabs)/profile",
    icon: User,
  },
];

export const TabBar = () => {
  const segments = useSegments();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const isActive = (tabName: string) => {
    // segments = ['(protected)', '(tabs)', 'index'] ou ['(protected)', '(tabs)', 'games'], etc.
    // Le dernier segment est le nom de la route actuelle
    const lastSegment = segments[segments.length - 1];
    const lastSegmentStr = String(lastSegment);

    // Pour index, vérifier si le dernier segment n'existe pas ou est "(tabs)"
    if (tabName === "index") {
      return (
        lastSegmentStr === "undefined" ||
        lastSegmentStr === "(tabs)" ||
        segments.length === 2 // ['(protected)', '(tabs)'] signifie qu'on est sur index
      );
    }

    // Pour les autres tabs, vérifier si le dernier segment correspond
    return lastSegmentStr === tabName;
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, spacing[2]),
          borderTopColor: colors.border.light,
        },
      ]}
    >
      {tabs.map((tab) => {
        const active = isActive(tab.name);
        const IconComponent = tab.icon;

        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => router.push(tab.route as any)}
            activeOpacity={0.7}
          >
            <IconComponent
              size={24}
              color={active ? colors.orange[500] : colors.text.secondary}
            />
            <Text style={[styles.label, active && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.background.secondary,
    borderTopWidth: borders.width.thin,
    ...shadows.sm,
    paddingTop: spacing[2],
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[2],
    gap: spacing[1],
  },
  label: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.normal,
  },
  labelActive: {
    color: colors.orange[500],
    fontWeight: typography.fontWeight.semibold,
  },
});
