import { View, Text, StyleSheet } from "react-native";

interface AnalysisBarProps {
  evaluation: number; // en centipawns (100 = 1 pawn)
  isWhiteToMove?: boolean;
}

export const AnalysisBar = ({
  evaluation,
  isWhiteToMove = true,
}: AnalysisBarProps) => {
  // Convertir centipawns en pawns
  const pawns = evaluation / 100;

  // Normaliser pour l'affichage (max ±10 pawns)
  const normalized = Math.max(-10, Math.min(10, pawns));
  const percentage = ((normalized + 10) / 20) * 100;

  // Formater l'évaluation pour l'affichage
  const formatEvaluation = () => {
    if (Math.abs(pawns) < 0.01) return "0.00";
    if (Math.abs(pawns) >= 10) {
      return pawns > 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
    }
    return pawns > 0 ? `+${pawns.toFixed(2)}` : pawns.toFixed(2);
  };

  return (
    <View style={styles.container}>
      <View style={styles.barContainer}>
        <View
          style={[
            styles.bar,
            {
              width: `${percentage}%`,
              backgroundColor: percentage > 50 ? "#4CAF50" : "#f44336",
            },
          ]}
        />
      </View>
      <Text style={styles.evaluation}>{formatEvaluation()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginVertical: 8,
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    overflow: "hidden",
    marginRight: 12,
  },
  bar: {
    height: "100%",
    alignSelf: "flex-end",
  },
  evaluation: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    minWidth: 60,
    textAlign: "right",
    fontFamily: "monospace",
  },
});
