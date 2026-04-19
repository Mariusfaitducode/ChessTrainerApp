import type { ChessEngine } from './stockfish.types';

export function createFakeEngine(): ChessEngine {
  return {
    async init() {},
    async evaluate() {
      return { cp: 0, bestMove: 'e2e4', mate: null };
    },
    async dispose() {},
  };
}
