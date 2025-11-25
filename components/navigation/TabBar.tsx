import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useSegments, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LayoutDashboard, Map, User, Trophy } from "lucide-react-native";

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
    icon: Trophy,
  },
  {
    name: "map",
    label: "Aventure",
    route: "/(protected)/(tabs)/map",
    icon: Map,
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
    const lastSegment = segments[segments.length - 1];
    const lastSegmentStr = String(lastSegment);

    if (tabName === "index") {
      return (
        lastSegmentStr === "undefined" ||
        lastSegmentStr === "(tabs)" ||
        (segments.length === 2 && lastSegmentStr === "index")
      );
    }

    return lastSegmentStr === tabName;
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, spacing[2]),
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
              color={active ? colors.text.primary : colors.text.tertiary}
              strokeWidth={2} // Trait fin mais visible
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
    backgroundColor: colors.background.primary,
    borderTopWidth: borders.width.medium, // 2px
    borderTopColor: colors.border.medium, // Noir
    paddingTop: spacing[3],
    // Pas d'ombre en haut, juste le trait noir
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[2],
    gap: spacing[1],
  },
  label: {
    fontFamily: typography.fontFamily.body, // Patrick Hand
    fontSize: 14,
    color: colors.text.tertiary,
  },
  labelActive: {
    color: colors.text.primary,
    fontSize: 14, // Garder la même taille
  },
});
