import { classify, computeLoss } from './classifier';
import type { Color, MoveEvaluation, Puzzle } from './types';

const MAX_PER_GAME = 6;
const PRIORITY: Record<'blunder' | 'mistake' | 'inaccuracy', number> = {
  blunder: 0,
  mistake: 1,
  inaccuracy: 2,
};

export function extractPuzzles(
  evaluations: MoveEvaluation[],
  userColor: Color,
  gameId: string,
  idGen: () => string,
): Puzzle[] {
  const candidates: Puzzle[] = [];

  evaluations.forEach((m) => {
    if (m.playedMove === m.bestMove) return;

    // Determine mover color from moveNumber parity: odd = white, even = black
    const moverColor: Color = m.moveNumber % 2 === 1 ? 'w' : 'b';
    if (moverColor !== userColor) return;

    const loss = computeLoss(m.evalBefore, m.evalAfter, moverColor);
    const quality = classify(loss);
    if (quality !== 'blunder' && quality !== 'mistake' && quality !== 'inaccuracy') {
      return;
    }

    candidates.push({
      id: idGen(),
      gameId,
      moveNumber: m.moveNumber,
      fen: m.fen,
      playedMove: m.playedMove,
      bestMove: m.bestMove,
      quality,
      evalLoss: loss,
      solvedAt: null,
    });
  });

  return candidates
    .sort((a, b) => PRIORITY[a.quality] - PRIORITY[b.quality])
    .slice(0, MAX_PER_GAME);
}
