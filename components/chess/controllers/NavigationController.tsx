import { useEffect, useRef } from "react";
import type { ChessboardRef } from "@/lib/react-native-chessboard/src";
import type { Move } from "chess.js";

interface NavigationControllerProps {
  chessboardRef: React.RefObject<ChessboardRef | null>;
  moveHistory: Move[];
  currentIndex: number;
  targetFen: string;
  enabled: boolean;
}

/**
 * Controller pour gérer la navigation dans l'historique d'une partie
 * Optimise les animations forward/backward et gère les highlights
 */
export function useNavigationController({
  chessboardRef,
  moveHistory,
  currentIndex,
  targetFen,
  enabled,
}: NavigationControllerProps) {
  const previousIndexRef = useRef<number>(currentIndex);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentNavigationPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (!enabled || !chessboardRef.current) {
      return;
    }

    // Si l'index n'a pas changé, ne rien faire
    if (currentIndex === previousIndexRef.current) {
      return;
    }

    // Annuler l'appel précédent s'il existe
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Debounce pour éviter les appels trop fréquents
    requestAnimationFrame(() => {
      timeoutRef.current = setTimeout(async () => {
        if (
          !chessboardRef.current ||
          currentIndex === previousIndexRef.current
        ) {
          return;
        }

        const previousIndex = previousIndexRef.current;
        previousIndexRef.current = currentIndex;

        try {
          // Stocker la promesse de navigation pour pouvoir l'annuler si nécessaire
          const navigationPromise = chessboardRef.current.navigateToPosition({
            targetFen,
            moveHistory: moveHistory.length > 0 ? moveHistory : undefined,
            currentIndex: previousIndex,
            targetIndex: currentIndex,
          });

          currentNavigationPromiseRef.current = navigationPromise;
          await navigationPromise;
        } catch (err) {
          console.error("[NavigationController] Erreur navigation:", err);
          // Fallback : utiliser resetBoard
          if (chessboardRef.current) {
            chessboardRef.current.resetBoard(targetFen);
          }
        } finally {
          currentNavigationPromiseRef.current = null;
        }
      }, 16); // ~1 frame à 60fps
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [currentIndex, targetFen, moveHistory, enabled, chessboardRef]);
}

