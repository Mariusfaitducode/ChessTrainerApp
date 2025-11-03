import { View, StyleSheet } from "react-native";
import { colors, spacing, borders } from "@/theme";

interface ProgressBarProps {
  current: number;
  total: number;
  height?: number;
}

export const ProgressBar = ({
  current,
  total,
  height = 200,
}: ProgressBarProps) => {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.track}>
        <View
          style={[
            styles.progress,
            {
              height: `${percentage}%`,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 8,
    justifyContent: "flex-end",
  },
  track: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.border.light,
    borderRadius: borders.radius.full,
    overflow: "hidden",
  },
  progress: {
    width: "100%",
    backgroundColor: colors.orange[500],
    borderRadius: borders.radius.full,
  },
});
