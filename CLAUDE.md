# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app does

ChessCorrect fetches a user's Chess.com games, analyzes them with Stockfish, and surfaces the positions where the user made mistakes as puzzles to solve. All-local, no auth, no server.

## Commands

```bash
npm install
npx expo prebuild         # regenerate ios/android native projects
npx expo run:ios          # or run:android — Expo dev build, not Expo Go
npm test                  # Jest
npm run test:watch
npm run lint
```

Single test: `npm test -- <pattern>` (e.g. `npm test -- classifier`).

## Architecture

Flat `src/` structure with strict dependency rules.

- **`src/domain/`** — pure TypeScript (chess.js only). Types, PGN parsing, centipawn classifier, puzzle extractor. No RN, no I/O. 100% covered by unit tests.
- **`src/db/`** — expo-sqlite schema + repositories (`gameRepo`, `puzzleRepo`). Tests use `:memory:` DB via a better-sqlite3 mock.
- **`src/services/`** — `chesscom.ts` (Chess.com API client), `stockfish.ts` (native Stockfish wrapper with a fake double for tests), `sync.ts` (orchestration).
- **`src/stores/`** — Zustand (`appStore`): username + sync status. Persists username via the `app_state` SQLite table, not AsyncStorage.
- **`src/ui/`** — `Button`, `Chessboard` (pure RN SVG, tap-to-move).
- **`src/screens/`** — 4 screens (Username, Games, PuzzleList, Puzzle).
- **`app/`** — Expo Router wrappers that just re-export screen components.

### Dependency rules (strict)

- `domain/` imports nothing from `db/`, `services/`, `stores/`, `ui/`, `screens/`, RN, or expo.
- `ui/` imports only RN + `src/theme.ts`.
- No cross-screen imports.

### Data flow

1. **Onboarding** — UsernameScreen validates pseudo via Chess.com API, persists in `app_state`.
2. **Sync** — GamesScreen → `syncAndAnalyze({username, engine, ...})` fetches 20 most-recent games, analyzes each move pair at depth 15, classifies, extracts up to 6 puzzles per game, persists. AbortSignal-aware.
3. **Solve** — PuzzleListScreen lists unsolved puzzles (sorted: blunder → mistake → inaccuracy). PuzzleScreen loads FEN, accepts a UCI move, validates against `bestMove`, marks solved.

## Testing

- **`domain/`** is TDD and 100% covered. New domain code must come with failing test first.
- **`db/`** tests open `:memory:` SQLite and reuse the real schema.
- **`services/chesscom.ts`** tests mock `global.fetch`.
- **`services/stockfish.ts`** is wrapped behind the `ChessEngine` interface; tests use `createFakeEngine()`.
- Screens are not exhaustively tested (smoke only); correctness comes from the TDD'd layers beneath.

## Stockfish

Real engine is `@udaychauhan/react-native-stockfish`. It's a native module — **Expo Go does not work**, you must use `expo run:ios` / `run:android`. The `ChessEngine` interface (see `src/services/stockfish.types.ts`) is the abstraction — swap the impl if you migrate packages.

## What's NOT here (deliberately)

No: auth, account, Supabase, backend, Lichess support, dark mode, web support, map/mascot, streak/achievements, push notifications, variations in PGN, opening book, cloud analysis.

## Design spec

See `docs/superpowers/specs/2026-04-19-chesscorrect-minimal-refactor-design.md`.
