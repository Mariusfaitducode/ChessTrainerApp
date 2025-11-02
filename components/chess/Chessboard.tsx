import { View, Text, StyleSheet, Dimensions } from "react-native";

interface ChessboardWrapperProps {
  fen?: string;
  onMove?: (move: { from: string; to: string; promotion?: string }) => boolean;
  boardOrientation?: "white" | "black";
  showCoordinates?: boolean;
}

// Placeholder pour l'échiquier - sera remplacé par react-chessboard (web)
// ou une solution native plus tard
export const ChessboardWrapper = ({
  fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  onMove,
  boardOrientation = "white",
  showCoordinates = true,
}: ChessboardWrapperProps) => {
  const boardSize = Math.min(Dimensions.get("window").width - 32, 400);

  return (
    <View style={styles.container}>
      <View
        style={[styles.placeholder, { width: boardSize, height: boardSize }]}
      >
        <Text style={styles.placeholderText}>Échiquier</Text>
        <Text style={styles.placeholderSubtext}>
          Visualisation à implémenter
        </Text>
        <Text style={styles.fenText}>{fen}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
  },
  placeholder: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#ddd",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 12,
    color: "#999",
    marginBottom: 16,
  },
  fenText: {
    fontSize: 10,
    color: "#bbb",
    fontFamily: "monospace",
    textAlign: "center",
    paddingHorizontal: 16,
  },
});
