import { useEffect, useRef } from "react";
import type { ChessboardRef } from "@/components/chess/react-native-chessboard/src";
import type { Move } from "chess.js";

interface NavigationControllerProps {
  chessboardRef: React.RefObject<ChessboardRef | null>;
  moveHistory: Move[];
  currentIndex: number;
  targetFen: string;
  previousFen?: string;
  enabled: boolean;
}

/**
 * Controller pour gérer la navigation dans l'historique d'une partie
 * Utilise uniquement move() pour déplacer les pièces avec animations
 */
export function useNavigationController({
  chessboardRef,
  moveHistory,
  currentIndex,
  targetFen,
  previousFen,
  enabled,
}: NavigationControllerProps) {
  const previousIndexRef = useRef<number>(currentIndex);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isNavigatingRef = useRef(false);
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

        // Si une navigation est déjà en cours, attendre qu'elle se termine
        if (isNavigatingRef.current && currentNavigationPromiseRef.current) {
          await currentNavigationPromiseRef.current;

          // Après avoir attendu, vérifier si l'index a encore changé
          if (currentIndex === previousIndexRef.current) {
            return;
          }
        }

        // Si on est toujours en train de naviguer (cas de race condition), ignorer cet appel
        if (isNavigatingRef.current) {
          return;
        }

        const previousIndex = previousIndexRef.current;
        previousIndexRef.current = currentIndex;

        // Marquer qu'on est en train de naviguer
        isNavigatingRef.current = true;

        // Créer une promesse pour cette navigation
        const navigationPromise = (async () => {
          try {
            if (
              !moveHistory ||
              moveHistory.length === 0 ||
              currentIndex < -1 ||
              currentIndex >= moveHistory.length
            ) {
              chessboardRef.current?.resetBoard(targetFen);
              return;
            }

            // Si on avance : jouer les nouveaux coups avec animations
            if (currentIndex > previousIndex) {
              // Synchroniser le chess engine à la position précédente avant de jouer les nouveaux coups
              // On ne reset PAS les highlights ici - HighlightController s'en charge
              if (previousFen && chessboardRef.current) {
                chessboardRef.current.resetBoard(previousFen);
                // Attendre un peu pour que le reset soit appliqué
                await new Promise((resolve) => setTimeout(resolve, 50));
              }

              // Jouer chaque nouveau coup avec animation
              for (let i = previousIndex + 1; i <= currentIndex; i++) {
                const move = moveHistory[i];
                if (move && chessboardRef.current) {
                  // Jouer le coup avec animation
                  // move() va automatiquement mettre à jour le chess engine interne
                  await chessboardRef.current.move({
                    from: move.from,
                    to: move.to,
                    promotion: move.promotion,
                  });

                  // Petit délai entre les coups pour que l'animation soit visible
                  await new Promise((resolve) => setTimeout(resolve, 20));
                }
              }
            } else if (currentIndex < previousIndex) {
              // Retour en arrière : utiliser resetBoard (plus rapide)
              // HighlightController gérera le highlight automatiquement
              chessboardRef.current?.resetBoard(targetFen);
            } else {
              // Même position : ne rien faire, HighlightController gère déjà
            }
          } catch {
            // Fallback : utiliser resetBoard
            if (chessboardRef.current) {
              chessboardRef.current.resetBoard(targetFen);
            }
          } finally {
            // Libérer le verrou après la navigation
            isNavigatingRef.current = false;
            currentNavigationPromiseRef.current = null;
          }
        })();

        // Stocker la promesse pour pouvoir l'annuler si nécessaire
        currentNavigationPromiseRef.current = navigationPromise;

        // Attendre la fin de la navigation
        await navigationPromise;
      }, 16); // ~1 frame à 60fps
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [
    currentIndex,
    targetFen,
    previousFen,
    moveHistory,
    enabled,
    chessboardRef,
  ]);
}
