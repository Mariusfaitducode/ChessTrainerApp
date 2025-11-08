import React, { useRef, useState, useEffect } from "react";
import { View, StyleSheet, Image } from "react-native";
import Chessboard, {
  type ChessboardRef,
} from "@/components/chess/react-native-chessboard/src";
import type { PieceType } from "@/components/chess/react-native-chessboard/src/types";
import { PIECES } from "@/components/chess/react-native-chessboard/src/constants";

interface ChessboardCoreProps {
  fen: string;
  boardOrientation: "white" | "black";
  showCoordinates: boolean;
  gestureEnabled?: boolean;
  onRefReady?: (ref: ChessboardRef | null) => void;
  onMove?: (info: {
    move: { from: string; to: string; promotion?: string };
  }) => boolean | void | Promise<boolean>;
}

export const ChessboardCore = React.forwardRef<
  ChessboardRef,
  ChessboardCoreProps
>(function ChessboardCore(
  {
    fen,
    boardOrientation,
    showCoordinates,
    gestureEnabled = false,
    onRefReady,
    onMove,
  },
  ref,
) {
  const chessboardRef = useRef<ChessboardRef>(null);
  const containerRef = useRef<View>(null);
  const [boardSize, setBoardSize] = useState(0);
  const isMountedRef = useRef(false);

  // Exposer le ref interne
  React.useImperativeHandle(
    ref,
    () => chessboardRef.current as ChessboardRef,
    [],
  );

  // Mesurer la taille du container avec onLayout
  const handleLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && width !== boardSize) {
      setBoardSize(width);
    }
  };

  // Initialiser le board après le montage
  useEffect(() => {
    if (boardSize > 0 && chessboardRef.current && !isMountedRef.current) {
      isMountedRef.current = true;
      if (__DEV__) {
        console.log(
          "[ChessboardCore] Initialisation du board avec FEN initial",
          fen.substring(0, 20),
        );
      }
      requestAnimationFrame(() => {
        if (chessboardRef.current) {
          chessboardRef.current.resetBoard(fen);
          if (onRefReady) {
            onRefReady(chessboardRef.current);
          }
        }
      });
    }
  }, [boardSize, fen, onRefReady]);

  // NE PAS mettre à jour automatiquement le FEN quand il change
  // NavigationController gère ça manuellement pour éviter les doubles appels
  // Le FEN initial est déjà géré dans le premier useEffect
  // useEffect(() => {
  //   if (isMountedRef.current && chessboardRef.current && fen) {
  //     requestAnimationFrame(() => {
  //       if (chessboardRef.current) {
  //         chessboardRef.current.resetBoard(fen);
  //       }
  //     });
  //   }
  // }, [fen]);

  // Gérer la rotation des pièces si le board est inversé
  const renderPiece =
    boardOrientation === "black"
      ? (piece: PieceType) => {
          const pieceSize = boardSize / 8;
          return (
            <Image
              source={PIECES[piece] as any}
              style={[
                { width: pieceSize, height: pieceSize },
                styles.pieceFlipped,
              ]}
            />
          );
        }
      : undefined;

  // Gérer les coups
  // IMPORTANT: react-native-chessboard retourne TOUJOURS les coordonnées dans le système standard
  // (blancs en bas), peu importe l'orientation visuelle du plateau. Donc on ne doit PAS inverser.
  const handleMove = onMove
    ? (info: {
        move: { from: string; to: string; promotion?: string };
      }): void => {
        if (__DEV__) {
          console.log(
            `[ChessboardCore] handleMove reçu: from=${info.move.from}, to=${info.move.to}, boardOrientation=${boardOrientation}`,
          );
        }

        // Pas d'inversion nécessaire : react-native-chessboard retourne déjà les coordonnées standard
        onMove(info);
      }
    : undefined;

  return (
    <View ref={containerRef} style={styles.container} onLayout={handleLayout}>
      {boardSize > 0 && (
        <View
          style={[
            styles.boardWrapper,
            boardOrientation === "black" && styles.boardFlipped,
          ]}
        >
          <Chessboard
            ref={chessboardRef}
            fen={fen}
            gestureEnabled={gestureEnabled}
            visualizationMode={!gestureEnabled}
            withLetters={showCoordinates && boardOrientation === "white"}
            withNumbers={showCoordinates && boardOrientation === "white"}
            boardSize={boardSize}
            renderPiece={renderPiece}
            onMove={handleMove}
            colors={{
              black: "#B58863",
              white: "#F0D9B5",
              lastMoveHighlight: "rgba(255, 255, 0, 0.4)",
            }}
            durations={{ move: 60 }}
          />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: "100%",
    aspectRatio: 1,
  },
  boardWrapper: {
    width: "100%",
    height: "100%",
  },
  boardFlipped: {
    transform: [{ rotate: "180deg" }],
  },
  pieceFlipped: {
    transform: [{ rotate: "180deg" }],
  },
});
