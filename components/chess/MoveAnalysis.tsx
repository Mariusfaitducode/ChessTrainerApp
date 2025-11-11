import React, { useMemo } from "react";
import { View, Image, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { GameAnalysis } from "@/types/database";
import { getQualityBadgeImage } from "@/utils/chess-badge";

interface MoveAnalysisProps {
  analysis: GameAnalysis | null;
  boardSize: number;
  boardOrientation: "white" | "black";
  lastMove?: { from: string; to: string };
  showBestMoveArrow?: boolean;
}

// Helper pour convertir un square (ex: "e2") en coordonnées pixel
// Note: Le boardWrapper a déjà un transform rotate(180deg) si boardOrientation === "black"
// Donc on calcule toujours dans le système standard (blancs en bas)
// et le transform CSS gère la rotation automatiquement
const squareToCoords = (
  square: string,
  boardSize: number,
): { x: number; y: number } => {
  const col = square[0].charCodeAt(0) - "a".charCodeAt(0);
  const row = parseInt(square[1], 10) - 1;

  const squareSize = boardSize / 8;
  const x = col * squareSize;
  const y = (7 - row) * squareSize;

  // Centrer sur la case
  return {
    x: x + squareSize / 2,
    y: y + squareSize / 2,
  };
};

// Helper pour parser un move UCI (ex: "e2e4") en from/to
const parseUciMove = (uci: string): { from: string; to: string } | null => {
  if (!uci || uci.length < 4) return null;
  return {
    from: uci.substring(0, 2),
    to: uci.substring(2, 4),
  };
};

// Composant pour la flèche SVG
const Arrow: React.FC<{
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  boardSize: number;
}> = ({ from, to, color, boardSize }) => {
  const squareSize = boardSize / 8;
  const arrowWidth = Math.max(3, squareSize * 0.12);
  const headLength = squareSize * 0.3;

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  // Calculer les points de la flèche
  const unitX = dx / length;
  const unitY = dy / length;

  // Point de départ (légèrement décalé du centre pour éviter de chevaucher la pièce)
  const startOffset = squareSize * 0.15;
  const startX = from.x + unitX * startOffset;
  const startY = from.y + unitY * startOffset;

  // Point d'arrivée (légèrement avant le centre pour éviter de chevaucher la pièce)
  const endOffset = squareSize * 0.15;
  const endX = to.x - unitX * endOffset;
  const endY = to.y - unitY * endOffset;

  // Points de la pointe de flèche
  const perpX = -unitY;
  const perpY = unitX;

  const arrowHead1X = endX - unitX * headLength + perpX * headLength * 0.5;
  const arrowHead1Y = endY - unitY * headLength + perpY * headLength * 0.5;
  const arrowHead2X = endX - unitX * headLength - perpX * headLength * 0.5;
  const arrowHead2Y = endY - unitY * headLength - perpY * headLength * 0.5;

  const path = `M ${startX} ${startY} L ${endX} ${endY} L ${arrowHead1X} ${arrowHead1Y} M ${endX} ${endY} L ${arrowHead2X} ${arrowHead2Y}`;

  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width={boardSize}
      height={boardSize}
      pointerEvents="none"
    >
      <Path
        d={path}
        stroke={color}
        strokeWidth={arrowWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export const MoveAnalysis: React.FC<MoveAnalysisProps> = React.memo(
  ({
    analysis,
    boardSize,
    boardOrientation,
    lastMove,
    showBestMoveArrow = true,
  }) => {
    // Calculer la position du badge (toujours visuellement en haut à droite)
    const badgePosition = useMemo(() => {
      if (!lastMove?.to) return null;
      const col = lastMove.to[0].charCodeAt(0) - "a".charCodeAt(0);
      const row = parseInt(lastMove.to[1], 10) - 1;
      const squareSize = boardSize / 8;
      const badgeSize = 28; // Taille du badge
      const padding = 12; // Padding depuis les bords

      // Position de la case (coin supérieur gauche dans le système standard)
      const squareX = col * squareSize;
      const squareY = (7 - row) * squareSize;

      // Badge toujours visuellement en haut à droite
      // Si boardOrientation === "white": coin supérieur droit (x + squareSize - badgeSize - padding, y + padding)
      // Si boardOrientation === "black": après rotation 180deg, pour avoir visuellement en haut à droite,
      // il faut calculer comme coin inférieur gauche dans le système standard
      if (boardOrientation === "white") {
        return {
          x: squareX + squareSize - badgeSize + padding,
          y: squareY - padding,
        };
      } else {
        // Pour boardOrientation === "black", après rotation 180deg,
        // le coin inférieur gauche devient visuellement coin supérieur droit
        return {
          x: squareX - padding,
          y: squareY + squareSize - badgeSize + padding,
        };
      }
    }, [lastMove, boardSize, boardOrientation]);

    // Calculer la flèche du meilleur coup
    const bestMoveArrow = useMemo(() => {
      if (!analysis?.best_move) return null;

      const bestMoveParsed = parseUciMove(analysis.best_move);
      if (!bestMoveParsed) return null;

      // Ne pas afficher si le meilleur coup est le même que le coup joué (si lastMove existe)
      if (
        lastMove &&
        bestMoveParsed.from === lastMove.from &&
        bestMoveParsed.to === lastMove.to
      ) {
        return null;
      }

      const fromCoords = squareToCoords(bestMoveParsed.from, boardSize);
      const toCoords = squareToCoords(bestMoveParsed.to, boardSize);

      return { from: fromCoords, to: toCoords };
    }, [analysis?.best_move, lastMove, boardSize]);

    const qualityBadgeImage = getQualityBadgeImage(analysis?.move_quality);

    if (!analysis) return null;

    // Si pas de lastMove, on peut quand même afficher la flèche du meilleur coup
    // mais pas le badge (qui nécessite un coup joué)

    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Badge de classification */}
        {badgePosition && analysis.move_quality && qualityBadgeImage && (
          <Image
            source={qualityBadgeImage}
            style={[
              styles.badge,
              {
                left: badgePosition.x,
                top: badgePosition.y,
                // Rotation inverse pour que le symbole reste lisible quand le board est inversé
                transform: [
                  { rotate: boardOrientation === "black" ? "180deg" : "0deg" },
                ],
              },
            ]}
            resizeMode="contain"
          />
        )}

        {/* Flèche du meilleur coup */}
        {showBestMoveArrow && bestMoveArrow && (
          <Arrow
            from={bestMoveArrow.from}
            to={bestMoveArrow.to}
            color="rgba(0, 150, 255, 0.7)"
            boardSize={boardSize}
          />
        )}
      </View>
    );
  },
);

MoveAnalysis.displayName = "MoveAnalysis";

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    width: 28,
    height: 28,
    zIndex: 1000,
    shadowRadius: 3,
    elevation: 5,
  },
});
