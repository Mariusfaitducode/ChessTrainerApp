# ChessCorrect

Résoudre tes propres erreurs d'échecs. Entre ton pseudo Chess.com, synchronise tes parties, résous les positions où tu t'es trompé.

100% local (SQLite + Stockfish natif), 0 compte, 0 serveur.

## Stack

Expo 54 · React 19 · React Native 0.81 · Expo Router · Zustand · expo-sqlite · @udaychauhan/react-native-stockfish · chess.js · Jest.

## Développement

Prérequis : Node 20+, Xcode (iOS) ou Android Studio, `expo-cli`.

```bash
npm install
npx expo prebuild
npx expo run:ios      # ou run:android
```

Tests :

```bash
npm test
npm run test:watch
```

## Structure

- `app/` — écrans Expo Router
- `src/domain/` — logique pure (PGN, classifier, extractor) — 100% testée
- `src/db/` — SQLite (schema + repos)
- `src/services/` — Chess.com API + Stockfish
- `src/stores/` — Zustand
- `src/ui/` — composants partagés (Chessboard, Button)
- `src/screens/` — écrans

Règle : `domain/` n'importe jamais de RN/expo/DB. Pur testable.
