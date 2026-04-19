import type { Game, GameResult, Color } from '../domain/types';

const BASE = 'https://api.chess.com/pub';

interface PlayerResult {
  exists: boolean;
  username: string;
}

interface RawGame {
  url: string;
  pgn: string;
  end_time: number;
  time_class: string;
  white: { username: string };
  black: { username: string };
}

export async function getPlayer(username: string): Promise<PlayerResult> {
  const u = username.toLowerCase();
  const res = await fetch(`${BASE}/player/${encodeURIComponent(u)}`);
  if (res.status === 200) {
    return { exists: true, username: u };
  }
  if (res.status === 404) {
    return { exists: false, username: u };
  }
  throw new Error(`chess.com API error: ${res.status}`);
}

export async function getRecentGames(
  username: string,
  max: number,
): Promise<Game[]> {
  const u = username.toLowerCase();
  const archivesRes = await fetch(`${BASE}/player/${encodeURIComponent(u)}/games/archives`);
  if (!archivesRes.ok) throw new Error(`archives: ${archivesRes.status}`);
  const { archives } = (await archivesRes.json()) as { archives: string[] };

  const result: Game[] = [];
  for (let i = archives.length - 1; i >= 0 && result.length < max; i--) {
    const monthRes = await fetch(archives[i]);
    if (!monthRes.ok) continue;
    const { games } = (await monthRes.json()) as { games: RawGame[] };
    const sorted = [...games].sort((a, b) => b.end_time - a.end_time);
    for (const g of sorted) {
      result.push(toGame(g, u));
      if (result.length >= max) break;
    }
  }
  return result;
}

function toGame(g: RawGame, user: string): Game {
  const userColor: Color = g.white.username.toLowerCase() === user ? 'w' : 'b';
  return {
    id: deriveId(g.url),
    playedAt: g.end_time * 1000,
    white: g.white.username,
    black: g.black.username,
    result: parseResult(g.pgn),
    userColor,
    timeClass: g.time_class ?? null,
    pgn: g.pgn,
    analyzedAt: null,
  };
}

function deriveId(url: string): string {
  const segments = url.split('/');
  return `chesscom-${segments[segments.length - 1]}`;
}

function parseResult(pgn: string): GameResult {
  const m = pgn.match(/\[Result\s+"([^"]+)"\]/);
  const r = m?.[1] ?? '*';
  if (r === '1-0' || r === '0-1' || r === '1/2-1/2') return r;
  return '1/2-1/2';
}
