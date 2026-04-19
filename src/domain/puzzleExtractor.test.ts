import { extractPuzzles } from './puzzleExtractor';
import type { MoveEvaluation } from './types';

function mv(partial: Partial<MoveEvaluation> & { moveNumber: number }): MoveEvaluation {
  return {
    moveNumber: partial.moveNumber,
    fen: partial.fen ?? 'fen' + partial.moveNumber,
    playedMove: partial.playedMove ?? 'e2e4',
    evalBefore: partial.evalBefore ?? 0,
    evalAfter: partial.evalAfter ?? 0,
    bestMove: partial.bestMove ?? 'd2d4',
  };
}

describe('extractPuzzles', () => {
  it('returns empty when no user move was bad', () => {
    const result = extractPuzzles(
      [mv({ moveNumber: 1, evalBefore: 20, evalAfter: 15 })],
      'w',
      'game-1',
      () => 'uuid-1',
    );
    expect(result).toEqual([]);
  });

  it('extracts a blunder with correct fields', () => {
    const result = extractPuzzles(
      [
        mv({
          moveNumber: 11,
          evalBefore: 100,
          evalAfter: -400,
          playedMove: 'c1b2',
          bestMove: 'd1h5',
          fen: 'fen-pos',
        }),
      ],
      'w',
      'game-42',
      () => 'uuid-42',
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'uuid-42',
      gameId: 'game-42',
      moveNumber: 11,
      fen: 'fen-pos',
      playedMove: 'c1b2',
      bestMove: 'd1h5',
      quality: 'blunder',
      evalLoss: 500,
      solvedAt: null,
    });
  });

  it('skips a move where best === played', () => {
    const result = extractPuzzles(
      [
        mv({
          moveNumber: 1,
          evalBefore: 100,
          evalAfter: -300,
          playedMove: 'e2e4',
          bestMove: 'e2e4',
        }),
      ],
      'w',
      'g',
      () => 'u',
    );
    expect(result).toEqual([]);
  });

  it('prioritizes blunders then mistakes then inaccuracies, capped at 6', () => {
    let i = 0;
    const gen = () => `u-${i++}`;

    const inacc = (n: number) =>
      mv({ moveNumber: n, evalBefore: 100, evalAfter: -50 });
    const mistakes = (n: number) =>
      mv({ moveNumber: n, evalBefore: 100, evalAfter: -200 });
    const blunder = (n: number) =>
      mv({ moveNumber: n, evalBefore: 100, evalAfter: -400 });

    const moves: MoveEvaluation[] = [
      inacc(1),
      mistakes(3),
      blunder(5),
      inacc(7),
      mistakes(9),
      blunder(11),
      inacc(13),
      mistakes(15),
    ];

    const result = extractPuzzles(moves, 'w', 'g', gen);
    expect(result).toHaveLength(6);
    expect(result.map((p) => p.quality)).toEqual([
      'blunder',
      'blunder',
      'mistake',
      'mistake',
      'mistake',
      'inaccuracy',
    ]);
  });

  it('only extracts from user moves (color filter)', () => {
    const moves = [
      mv({ moveNumber: 1, evalBefore: 0, evalAfter: -600 }), // white blunder (index 0 = white)
      mv({ moveNumber: 2, evalBefore: -100, evalAfter: -600 }), // black, index 1 (improvement, not blunder)
    ];
    const result = extractPuzzles(moves, 'b', 'g', () => 'u');
    expect(result).toEqual([]);
  });

});
