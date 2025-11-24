import React, { useRef, useEffect } from "react";
import { View, StyleSheet } from "react-native";

import { colors, borders } from "@/theme";
import { ChessboardCore } from "./core/ChessboardCore";
import type { ChessboardRef } from "./react-native-chessboard/src";

interface ChessboardPreviewProps {
  fen: string;
  boardOrientation?: "white" | "black";
}

/**
 * Échiquier de prévisualisation compact et non-interactif
 * Utilise react-native-chessboard en mode visualisation
 * Prend toute la hauteur disponible du container parent
 * Utilisé pour afficher une position dans des cartes ou boutons
 */
export const ChessboardPreview = ({
  fen,
  boardOrientation = "white",
}: ChessboardPreviewProps) => {
  const chessboardRef = useRef<ChessboardRef | null>(null);

  // Mettre à jour le FEN quand il change
  useEffect(() => {
    if (chessboardRef.current && fen) {
      requestAnimationFrame(() => {
        chessboardRef.current?.resetBoard(fen);
      });
    }
  }, [fen]);

  return (
    <View style={styles.container}>
      <ChessboardCore
        ref={chessboardRef}
        fen={fen}
        boardOrientation={boardOrientation}
        showCoordinates={false}
        gestureEnabled={false}
        showBestMoveArrow={false}
        onRefReady={(ref) => {
          chessboardRef.current = ref;
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: "100%",
    aspectRatio: 1,
    overflow: "hidden",
  },
});
