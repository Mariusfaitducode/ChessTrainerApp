import React, { useRef, useState, useEffect } from "react";
import { View, StyleSheet, Image } from "react-native";
import Chessboard, {
  type ChessboardRef,
} from "@/lib/react-native-chessboard/src";
import type { PieceType } from "@/lib/react-native-chessboard/src/types";

const PIECES =
  require("@/lib/react-native-chessboard/lib/commonjs/constants").PIECES;

interface ChessboardCoreProps {
  fen: string;
  boardOrientation: "white" | "black";
  showCoordinates: boolean;
  gestureEnabled?: boolean;
  onRefReady?: (ref: ChessboardRef | null) => void;
  onMove?: (info: {
    move: { from: string; to: string; promotion?: string };
  }) => boolean | void;
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

  // Mettre à jour le FEN quand il change
  useEffect(() => {
    if (isMountedRef.current && chessboardRef.current && fen) {
      requestAnimationFrame(() => {
        if (chessboardRef.current) {
          chessboardRef.current.resetBoard(fen);
        }
      });
    }
  }, [fen]);

  // Gérer la rotation des pièces si le board est inversé
  const renderPiece =
    boardOrientation === "black"
      ? (piece: PieceType) => {
          const pieceSize = boardSize / 8;
          return (
            <Image
              source={PIECES[piece]}
              style={[
                { width: pieceSize, height: pieceSize },
                styles.pieceFlipped,
              ]}
            />
          );
        }
      : undefined;

  // Gérer l'inversion des coordonnées des coups si le board est inversé
  const handleMove = onMove
    ? (info: {
        move: { from: string; to: string; promotion?: string };
      }): void => {
        if (boardOrientation === "black") {
          // Inverser les coordonnées : a1 -> h8, h8 -> a1, etc.
          const flipSquare = (square: string): string => {
            const file = square[0];
            const rank = square[1];
            const newFile = String.fromCharCode(
              97 + (7 - (file.charCodeAt(0) - 97)),
            );
            const newRank = String(8 - parseInt(rank) + 1);
            return newFile + newRank;
          };

          onMove({
            move: {
              from: flipSquare(info.move.from),
              to: flipSquare(info.move.to),
              promotion: info.move.promotion,
            },
          });
        } else {
          onMove(info);
        }
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
