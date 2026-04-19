# ChessCorrect — Refactor minimal (V1)

**Date** : 2026-04-19
**Branche** : `refactor/minimal`

## 1. Objectif

Reconstruire ChessCorrect sur des bases solides en supprimant tout ce qui ne sert pas au cœur du produit : **importer ses parties Chess.com, les analyser, résoudre ses erreurs.**

Rien d'autre en V1.

## 2. Décisions produit

- **Plateforme unique** : Chess.com (pas de Lichess).
- **Pas de compte** : pseudo entré une fois, stocké localement.
- **Tout local** : SQLite sur device, Stockfish natif, aucun backend, aucun service tiers (pas de Supabase).
- **3 écrans** : Username, Games, Puzzle. Plus un sous-écran "liste de puzzles".
- **Puzzles en libre accès** : pas d'ordre forcé, pas de lock.
- **Pas de gamification** : ni map, ni mascotte, ni streak, ni stats.
- **Langue** : 100% français.
- **Dark mode** : non (V1).

## 3. Stack technique

| Couche | Choix |
|---|---|
| Mobile | Expo 54 + React 19 + React Native 0.81 |
| Routing | Expo Router v6 |
| State | Zustand |
| DB locale | expo-sqlite |
| Analyse | `react-native-stockfish` (module natif) |
| Chess logic | `chess.js@^1.4.0` (stable) |
| UI | React Native natif, `lucide-react-native`, `@shopify/flash-list` pour la liste de parties |
| Tests | Jest + `@testing-library/react-native` |

**Workflow dev** : Expo dev build (`expo run:ios` / `expo run:android`). Plus d'Expo Go.
**Web/Android/iOS** : iOS + Android uniquement. Le support web est supprimé (inutile pour ce flow).

## 4. Architecture

### 4.1 Structure

```
src/
├── screens/
│   ├── UsernameScreen.tsx
│   ├── GamesScreen.tsx
│   ├── PuzzleListScreen.tsx
│   └── PuzzleScreen.tsx
├── stores/
│   └── appStore.ts              # Zustand
├── services/
│   ├── chesscom.ts              # API Chess.com
│   └── stockfish.ts             # wrapper react-native-stockfish
├── domain/                       # PUR — aucune dép RN/I/O
│   ├── classifier.ts
│   ├── puzzleExtractor.ts
│   └── pgn.ts
├── db/
│   ├── schema.ts
│   ├── gameRepo.ts
│   └── puzzleRepo.ts
├── ui/
│   ├── Chessboard.tsx
│   └── Button.tsx
├── theme.ts
app/                              # Expo Router
├── _layout.tsx
├── index.tsx                    # redirige vers /username ou /games
├── username.tsx
├── games.tsx
├── puzzles.tsx
└── puzzle/[id].tsx
```

### 4.2 Règles de dépendances

- `domain/` ne dépend de rien (pas de RN, pas de DB, pas d'I/O). → 100% testable en pur.
- `services/` et `db/` dépendent de `domain/` (types).
- `screens/` dépendent de tout sauf d'autres écrans.
- `ui/` dépend uniquement de `react-native` et `theme.ts`.
- Aucune dépendance circulaire.
- Aucun import cross-écrans (un écran importe via ses services/stores, jamais un autre écran).

### 4.3 Dépendances npm

**Gardées** :
`expo`, `expo-router`, `expo-splash-screen`, `expo-sqlite`, `expo-status-bar`, `expo-constants`, `expo-dev-client`, `expo-linking`,
`react`, `react-native`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-safe-area-context`, `react-native-screens`, `react-native-svg`,
`chess.js`, `lucide-react-native`, `zustand`, `react-native-stockfish`, `@shopify/flash-list`.

**Supprimées** :
`@supabase/supabase-js`, `@tanstack/react-query`, `@react-native-async-storage/async-storage`,
`expo-auth-session`, `expo-web-browser`, `expo-crypto`, `expo-font`,
`@expo-google-fonts/fredoka`, `@expo-google-fonts/patrick-hand`,
`stockfish.js`, `pgn-parser`, `react-dom`, `react-native-web`.

Le package exact pour Stockfish natif sera confirmé à l'étape d'implémentation (plusieurs forks existent : `react-native-stockfish`, `react-native-stockfish-chess-engine`). Le choix sera fait sur le plus récemment maintenu et compatible New Architecture.

**Ajoutées dev** : `jest`, `jest-expo`, `@testing-library/react-native`, `@types/jest`.

## 5. Data model (SQLite)

```sql
CREATE TABLE games (
  id TEXT PRIMARY KEY,
  played_at INTEGER NOT NULL,
  white TEXT NOT NULL,
  black TEXT NOT NULL,
  result TEXT NOT NULL,          -- '1-0' | '0-1' | '1/2-1/2'
  user_color TEXT NOT NULL,      -- 'w' | 'b'
  time_class TEXT,               -- 'bullet' | 'blitz' | 'rapid' | 'daily'
  pgn TEXT NOT NULL,
  analyzed_at INTEGER
);
CREATE INDEX idx_games_played_at ON games(played_at DESC);

CREATE TABLE puzzles (
  id TEXT PRIMARY KEY,           -- uuid local
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  move_number INTEGER NOT NULL,
  fen TEXT NOT NULL,
  played_move TEXT NOT NULL,     -- UCI
  best_move TEXT NOT NULL,       -- UCI
  quality TEXT NOT NULL,         -- 'blunder' | 'mistake' | 'inaccuracy'
  eval_loss INTEGER NOT NULL,    -- centipawns
  solved_at INTEGER
);
CREATE INDEX idx_puzzles_solved ON puzzles(solved_at);
CREATE INDEX idx_puzzles_game ON puzzles(game_id);

CREATE TABLE app_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- keys utilisées : 'username', 'last_sync_at'
```

Pas de persistance des analyses coup-par-coup. On ne garde que les puzzles extraits.

## 6. Flows

### 6.1 Onboarding
```
User tape pseudo
→ chesscom.getPlayer(pseudo)
→ si 404 : erreur inline, rester
→ si 200 : app_state set username, router.replace('/games')
```

### 6.2 Sync + analyse
```
GamesScreen mount → gameRepo.listAll() → affiche l'existant
Bouton "Synchroniser" :
  chesscom.getRecentGames(username, 20)
  → dedup sur game.id
  → gameRepo.insertMany(newGames)
  → pour chaque partie non analysée (série) :
      pgn.parse(game.pgn)
      stockfish.analyzeMoves(moves, depth=15) → { evalBefore, evalAfter, bestMove }[]
      classifier.classify(...) → quality + loss
      puzzleExtractor.extract(analyses, userColor) → Puzzle[]
      puzzleRepo.insertMany(puzzles)
      gameRepo.markAnalyzed(game.id)
      UI re-render : progression 3/20
```

**Annulation** : si user quitte l'écran, un AbortController signal stoppe proprement la boucle entre deux parties.

### 6.3 Résolution
```
PuzzleListScreen → filtre "tous / blunders / mistakes / inaccuracies"
  → tap → router.push('/puzzle/' + id)
PuzzleScreen :
  Chessboard fen, orientation userColor
  User joue un coup (drag-drop) → UCI
  UCI === bestMove ? ✓ solved_at = now() : ✗ (revient à fen après 1s)
  Boutons : Indice (nom pièce) · Solution · Suivant
  "Suivant" charge le prochain puzzle non résolu ou retourne à /games
```

## 7. Gestion d'erreur

| Cas | Comportement |
|---|---|
| Chess.com API down | Banner "Sync impossible, réessayer", données locales restent utilisables |
| Pseudo 404 | Message inline sur UsernameScreen |
| Rate limit Chess.com (429) | Back-off 2s, 3 retries, puis abandon |
| PGN malformé | Skip la partie avec log, continuer les autres |
| Stockfish crash | `analyzed_at` reste NULL, user relance |
| User quitte pendant analyse | AbortController propre, reprise au prochain sync |
| 0 partie sur Chess.com | Empty state "Aucune partie trouvée" |
| DB corrompue | Bouton "Reset app" (drop all, relancer onboarding) |
| Changement de pseudo | Confirmation modale → drop toutes les données → retour `/username` |

Règle : try/catch uniquement aux frontières (services, DB, stockfish). Pas de défensivité profonde dans le domaine.

## 8. Testing strategy

- **`domain/`** : TDD strict, Jest, 100% de coverage visé.
- **`db/`** : expo-sqlite en mode mémoire pour les tests.
- **`services/chesscom.ts`** : mocks fetch.
- **`services/stockfish.ts`** : interface abstraite, fake impl pour les tests de screen.
- **`screens/`** : smoke tests + interactions critiques.
- **E2E Maestro** : hors V1.
- **Targets** : 100% domain, 70%+ global.

## 9. Sequence de refactor (commits compartimentés)

1. `chore: wipe obsolete source and docs`
2. `chore: trim deps, add sqlite/zustand/stockfish/jest`
3. `chore: bootstrap src/ skeleton`
4. `feat(domain): classifier + tests`
5. `feat(domain): puzzle extractor + tests`
6. `feat(domain): pgn helpers + tests`
7. `feat(db): schema + migrations`
8. `feat(db): game and puzzle repos + tests`
9. `feat(services): chess.com api client + tests`
10. `feat(services): stockfish engine wrapper`
11. `feat(stores): zustand app store`
12. `feat(ui): chessboard component`
13. `feat(ui): button + theme`
14. `feat(screens): username + routing`
15. `feat(screens): games + sync flow`
16. `feat(screens): puzzle list + puzzle screen`
17. `chore: wire navigation, splash, typed routes`
18. `docs: README + CLAUDE.md`

Chaque commit doit laisser le projet dans un état qui compile, au minimum.

## 10. Hors scope V1 (explicitement)

- Support Lichess
- Comptes utilisateur / OAuth / cloud sync
- Dark mode
- Map narrative / mascotte / gamification
- Stats d'évolution / graphes
- Support web
- Mode invité avec migration
- Notifications push
- CI/CD
- Deep linking OAuth
- Multi-langue (EN)

Tout ce qui est ici est ouvert pour V1.1+ si l'usage le justifie.

## 11. Milestones de test manuel

À chaque milestone, je lance l'app en local et vérifie que le flow marche :

- **M1** (après commit 8) : tests passent, DB fonctionne en mémoire.
- **M2** (après commit 9) : fetch Chess.com marche dans un test manuel.
- **M3** (après commit 10) : Stockfish évalue une position réelle.
- **M4** (après commit 14) : UsernameScreen tourne sur simulateur iOS.
- **M5** (après commit 15) : sync + analyse complètes fonctionnent sur une vraie partie.
- **M6** (après commit 16) : flow complet onboarding → sync → résoudre un puzzle.
