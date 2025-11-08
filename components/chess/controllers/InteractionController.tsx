import { useCallback } from "react";

interface MoveInfo {
  from: string;
  to: string;
  promotion?: string;
}

interface InteractionControllerProps {
  onMove: (move: MoveInfo) => boolean | void | Promise<boolean>;
  enabled: boolean;
}

/**
 * Controller pour gérer les interactions avec le plateau
 * Valide les coups et gère les callbacks onMove
 */
export function useInteractionController({
  onMove,
  enabled,
}: InteractionControllerProps) {
  const handleMove = useCallback(
    async (info: {
      move: { from: string; to: string; promotion?: string };
    }) => {
      if (!enabled || !onMove) {
        return false;
      }

      try {
        const result = await onMove({
          from: info.move.from,
          to: info.move.to,
          promotion: info.move.promotion,
        });

        // Si onMove retourne false, le coup est rejeté
        // Sinon, le coup est accepté et sera joué par react-native-chessboard
        return result !== false;
      } catch (error) {
        console.error("[InteractionController] Erreur dans onMove:", error);
        return false;
      }
    },
    [onMove, enabled],
  );

  return {
    gestureEnabled: enabled && !!onMove,
    onMove: handleMove,
  };
}
