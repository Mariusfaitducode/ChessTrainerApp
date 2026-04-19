import { parseGame, playerColor } from './pgn';

const SAMPLE_PGN = `[Event "Live Chess"]
[White "AliceB"]
[Black "marius123"]
[Result "1-0"]
[TimeControl "300"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0`;

describe('parseGame', () => {
  it('parses headers', () => {
    const g = parseGame(SAMPLE_PGN);
    expect(g.headers.White).toBe('AliceB');
    expect(g.headers.Black).toBe('marius123');
    expect(g.headers.Result).toBe('1-0');
  });

  it('parses mainline moves with SAN and resulting FENs', () => {
    const g = parseGame(SAMPLE_PGN);
    expect(g.moves.length).toBe(6);
    expect(g.moves[0].san).toBe('e4');
    expect(g.moves[0].color).toBe('w');
    expect(g.moves[0].moveNumber).toBe(1);
    expect(g.moves[0].fenBefore).toBe(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    );
    expect(g.moves[0].fenAfter).toContain('b'); // After white's move, it's black's turn
  });

  it('extracts UCI for each move', () => {
    const g = parseGame(SAMPLE_PGN);
    expect(g.moves[0].uci).toBe('e2e4');
    expect(g.moves[1].uci).toBe('e7e5');
  });

  it('throws on malformed pgn', () => {
    expect(() => parseGame('not a pgn')).toThrow();
  });
});

describe('playerColor', () => {
  it('returns "w" when user is white (case insensitive)', () => {
    expect(playerColor({ White: 'AliceB', Black: 'marius123' }, 'aliceb')).toBe(
      'w',
    );
  });
  it('returns "b" when user is black', () => {
    expect(
      playerColor({ White: 'AliceB', Black: 'marius123' }, 'MARIUS123'),
    ).toBe('b');
  });
  it('throws when user is not in the game', () => {
    expect(() =>
      playerColor({ White: 'AliceB', Black: 'marius123' }, 'nobody'),
    ).toThrow(/not found/i);
  });
});
