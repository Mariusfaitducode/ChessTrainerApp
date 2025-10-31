import { View, Text, StyleSheet, ScrollView } from "react-native";

import type { GameMove } from "@/types/chess";

interface MoveListProps {
  moves: GameMove[];
  currentMove?: number;
  onMoveSelect?: (moveNumber: number) => void;
}

export const MoveList = ({
  moves,
  currentMove,
  onMoveSelect,
}: MoveListProps) => {
  return (
    <ScrollView style={styles.container} horizontal>
      <View style={styles.movesContainer}>
        {moves.map((move, index) => {
          const moveNumber = Math.floor(index / 2) + 1;
          const isWhiteMove = index % 2 === 0;
          const isCurrent = currentMove === index;

          return (
            <View
              key={index}
              style={[
                styles.move,
                isCurrent && styles.currentMove,
                isWhiteMove && styles.moveNumber,
              ]}
            >
              {isWhiteMove && (
                <Text style={styles.moveNumberText}>{moveNumber}.</Text>
              )}
              <Text
                style={[
                  styles.moveText,
                  isCurrent && styles.currentMoveText,
                  isWhiteMove ? styles.whiteMove : styles.blackMove,
                ]}
              >
                {move.white || move.black}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: 200,
  },
  movesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 12,
  },
  move: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
    borderRadius: 4,
  },
  currentMove: {
    backgroundColor: "#2196F3",
  },
  moveNumber: {
    marginRight: 4,
  },
  moveNumberText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  moveText: {
    fontSize: 14,
    fontFamily: "monospace",
  },
  whiteMove: {
    color: "#000",
  },
  blackMove: {
    color: "#666",
  },
  currentMoveText: {
    color: "#fff",
    fontWeight: "600",
  },
});
