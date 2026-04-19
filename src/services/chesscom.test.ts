import { getPlayer, getRecentGames } from './chesscom';

const originalFetch = global.fetch;

function mockFetch(handler: (url: string) => { status: number; body: unknown }) {
  global.fetch = jest.fn(async (url: string) => {
    const { status, body } = handler(url);
    return {
      ok: status < 400,
      status,
      async json() {
        return body;
      },
    } as Response;
  }) as unknown as typeof fetch;
}

afterEach(() => {
  global.fetch = originalFetch;
});

describe('getPlayer', () => {
  it('returns exists true on 200', async () => {
    mockFetch(() => ({ status: 200, body: { username: 'marius123' } }));
    const r = await getPlayer('marius123');
    expect(r).toEqual({ exists: true, username: 'marius123' });
  });

  it('returns exists false on 404', async () => {
    mockFetch(() => ({ status: 404, body: {} }));
    const r = await getPlayer('nopeuser');
    expect(r.exists).toBe(false);
  });

  it('throws on 5xx', async () => {
    mockFetch(() => ({ status: 500, body: {} }));
    await expect(getPlayer('x')).rejects.toThrow();
  });

  it('normalizes username to lowercase in URL', async () => {
    const seen: string[] = [];
    mockFetch((url) => {
      seen.push(url);
      return { status: 200, body: {} };
    });
    await getPlayer('MARIUS123');
    expect(seen[0]).toContain('/pub/player/marius123');
  });
});

describe('getRecentGames', () => {
  it('fetches most-recent archive and maps to Game objects', async () => {
    mockFetch((url) => {
      if (url.endsWith('/archives')) {
        return {
          status: 200,
          body: {
            archives: [
              'https://api.chess.com/pub/player/alice/games/2024/01',
              'https://api.chess.com/pub/player/alice/games/2024/02',
            ],
          },
        };
      }
      if (url.endsWith('/2024/02')) {
        return {
          status: 200,
          body: {
            games: [
              {
                url: 'https://www.chess.com/game/live/1',
                pgn: '[White "alice"]\n[Black "bob"]\n[Result "1-0"]\n[TimeControl "180"]\n\n1. e4 1-0',
                end_time: 1_700_000_000,
                time_class: 'blitz',
                white: { username: 'alice' },
                black: { username: 'bob' },
              },
            ],
          },
        };
      }
      return { status: 404, body: {} };
    });

    const games = await getRecentGames('alice', 10);
    expect(games).toHaveLength(1);
    expect(games[0]).toMatchObject({
      id: expect.any(String),
      white: 'alice',
      black: 'bob',
      result: '1-0',
      userColor: 'w',
      timeClass: 'blitz',
    });
    expect(games[0].playedAt).toBe(1_700_000_000_000);
  });

  it('walks back older archives until max games collected', async () => {
    const games01 = Array.from({ length: 2 }, (_, i) => ({
      url: `g-jan-${i}`,
      pgn: `[White "alice"]\n[Black "b"]\n[Result "1-0"]\n\n1. e4 1-0`,
      end_time: 1_700_000_000 + i,
      time_class: 'blitz',
      white: { username: 'alice' },
      black: { username: 'b' },
    }));
    const games02 = Array.from({ length: 3 }, (_, i) => ({
      url: `g-feb-${i}`,
      pgn: `[White "a2"]\n[Black "alice"]\n[Result "0-1"]\n\n1. e4 0-1`,
      end_time: 1_710_000_000 + i,
      time_class: 'blitz',
      white: { username: 'a2' },
      black: { username: 'alice' },
    }));
    mockFetch((url) => {
      if (url.endsWith('/archives')) {
        return {
          status: 200,
          body: {
            archives: [
              'https://api.chess.com/pub/player/alice/games/2024/01',
              'https://api.chess.com/pub/player/alice/games/2024/02',
            ],
          },
        };
      }
      if (url.endsWith('/2024/02')) return { status: 200, body: { games: games02 } };
      if (url.endsWith('/2024/01')) return { status: 200, body: { games: games01 } };
      return { status: 404, body: {} };
    });

    const games = await getRecentGames('alice', 4);
    expect(games).toHaveLength(4);
    expect(games[0].playedAt).toBeGreaterThan(games[3].playedAt);
  });

  it('returns empty when player has no archives', async () => {
    mockFetch(() => ({ status: 200, body: { archives: [] } }));
    const games = await getRecentGames('newplayer', 20);
    expect(games).toEqual([]);
  });

  it('deterministically derives id from url', async () => {
    mockFetch((url) => {
      if (url.endsWith('/archives')) {
        return {
          status: 200,
          body: {
            archives: ['https://api.chess.com/pub/player/alice/games/2024/02'],
          },
        };
      }
      return {
        status: 200,
        body: {
          games: [
            {
              url: 'https://www.chess.com/game/live/12345',
              pgn: '[White "alice"]\n[Black "b"]\n[Result "1-0"]\n\n1. e4 1-0',
              end_time: 1_700_000_000,
              time_class: 'blitz',
              white: { username: 'alice' },
              black: { username: 'b' },
            },
          ],
        },
      };
    });
    const g1 = await getRecentGames('alice', 1);
    const g2 = await getRecentGames('alice', 1);
    expect(g1[0].id).toBe(g2[0].id);
  });
});
