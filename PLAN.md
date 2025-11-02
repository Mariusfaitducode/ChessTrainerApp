# Plan d'implémentation - Application d'échecs

## Architecture globale

```
App Mobile (React Native + Expo)
    ↓
Supabase (Backend + DB)
    ↓
APIs externes (Lichess API, Chess.com API)
```

## Phases de développement

### Phase 1 : Configuration et infrastructure de base

#### 1.1 Dépendances nécessaires
- `react-native-chessboardjsx` ou `react-chessboard` pour la visualisation
- `chess.js` pour la logique de jeu et l'analyse
- `@react-native-oauth` ou `expo-auth-session` pour OAuth Lichess/Chess.com
- `@tanstack/react-query` pour la gestion de cache et requêtes

#### 1.2 Schéma de base de données Supabase

**Table `user_platforms`**
- `id` (uuid, PK)
- `user_id` (uuid, FK -> auth.users)
- `platform` (text: 'lichess' | 'chesscom')
- `platform_username` (text)
- `access_token` (text, encrypted)
- `refresh_token` (text, encrypted)
- `last_sync_at` (timestamp)
- `created_at` (timestamp)

**Table `games`**
- `id` (uuid, PK)
- `user_id` (uuid, FK -> auth.users)
- `platform` (text)
- `platform_game_id` (text)
- `pgn` (text)
- `white_player` (text)
- `black_player` (text)
- `result` (text)
- `time_control` (text)
- `played_at` (timestamp)
- `imported_at` (timestamp)

**Table `game_analyses`**
- `id` (uuid, PK)
- `game_id` (uuid, FK -> games.id)
- `move_number` (integer)
- `fen` (text)
- `evaluation` (float)
- `best_move` (text)
- `played_move` (text)
- `mistake_level` (text: 'blunder' | 'mistake' | 'inaccuracy' | null)
- `analysis_data` (jsonb)
- `created_at` (timestamp)

**Table `exercises`**
- `id` (uuid, PK)
- `user_id` (uuid, FK -> auth.users)
- `game_id` (uuid, FK -> games.id)
- `game_analysis_id` (uuid, FK -> game_analyses.id)
- `fen` (text)
- `position_description` (text)
- `exercise_type` (text: 'find_best_move' | 'find_mistake' | 'tactical_puzzle')
- `correct_move` (text)
- `hints` (jsonb)
- `difficulty` (integer 1-5)
- `completed` (boolean)
- `score` (integer)
- `created_at` (timestamp)

#### 1.3 Structure de dossiers
```
app/
  (protected)/
    (tabs)/
      index.tsx (Dashboard avec liste des parties)
      games.tsx (Liste des parties)
      exercises.tsx (Liste des exercices)
      profile.tsx (Paramètres + connexion plateformes)
  (public)/
    ...

services/
  lichess/
    api.ts (Appels API Lichess)
    types.ts (Types TypeScript)
  chesscom/
    api.ts
    types.ts
  chess/
    engine.ts (Moteur d'analyse avec chess.js)
    analyzer.ts (Détection erreurs)
    exercise-generator.ts (Génération exercices)

hooks/
  useGames.ts
  useExercises.ts
  useChessPlatform.ts
  useGameAnalysis.ts

components/
  chess/
    Chessboard.tsx (Composant échiquier)
    MoveList.tsx (Liste des coups)
    AnalysisBar.tsx (Barre d'évaluation)
  games/
    GameCard.tsx
    GameDetails.tsx
  exercises/
    ExerciseCard.tsx
    ExercisePlayer.tsx

types/
  chess.ts
  games.ts
  exercises.ts

utils/
  pgn.ts (Parsing PGN)
  chess.ts (Helpers chess)
```

### Phase 2 : Authentification OAuth

#### 2.1 OAuth Lichess
- Utiliser OAuth 2.0 de Lichess
- Flow: User connecte → Redirect vers Lichess → Callback avec token
- Stocker token dans `user_platforms`

#### 2.2 OAuth Chess.com
- Utiliser OAuth de Chess.com
- Même flow que Lichess

#### 2.3 UI Connexion
- Page dans Profile pour connecter/déconnecter plateformes
- Afficher username connecté

### Phase 3 : Récupération des parties

#### 3.1 Service Lichess API
- Endpoint: `/api/account`
- Endpoint: `/api/games/user/{username}`
- Parser PGN reçu

#### 3.2 Service Chess.com API
- Endpoint: `/pub/player/{username}/games/{YYYY}/{MM}`
- Parser PGN

#### 3.3 Synchronisation
- Hook `useGames` qui fetch depuis plateformes
- Sauvegarde dans Supabase `games`
- Système de sync automatique (background task ou manuel)

### Phase 4 : Analyse des parties

#### 4.1 Moteur d'analyse
- Utiliser `chess.js` pour parser PGN
- Utiliser API externe (Stockfish via backend Supabase Edge Function) ou bibliothèque JS
- Pour chaque coup:
  - Évaluation position
  - Meilleur coup
  - Comparaison coup joué vs meilleur coup
  - Classification: blunder/mistake/inaccuracy

#### 4.2 Stockage analyses
- Pour chaque partie analysée, stocker dans `game_analyses`
- Calculer statistiques globales (taux d'erreurs, etc.)

#### 4.3 UI Analyse
- Vue détaillée d'une partie avec:
  - Échiquier interactif
  - Liste des coups
  - Barre d'évaluation
  - Marquage des erreurs

### Phase 5 : Génération d'exercices

#### 5.1 Logique génération
- Pour chaque erreur détectée dans `game_analyses`:
  - Créer exercice de type "find_best_move" ou "find_mistake"
  - Extraire position (FEN) de l'erreur
  - Stocker coup correct et hints

#### 5.2 Types d'exercices
- **Find best move**: Position avec erreur, trouver meilleur coup
- **Find mistake**: Rejouer jusqu'à l'erreur, identifier le mauvais coup
- **Tactical puzzle**: Créer puzzle tactique basé sur position d'erreur

#### 5.3 UI Exercices
- Liste des exercices disponibles
- Player interactif pour résoudre exercices
- Feedback (correct/incorrect)
- Scoring et progression

### Phase 6 : UI/UX et polish

#### 6.1 Design
- Thème sombre/clair
- Animations fluides
- Responsive (mobile + web)

#### 6.2 Performance
- Lazy loading parties
- Cache analyses
- Optimisation images échiquier

#### 6.3 Features bonus
- Notifications pour nouveaux exercices
- Statistiques globales utilisateur
- Partager exercices/analyses

## Ordre d'implémentation recommandé

1. **Setup infrastructure** (Phase 1) - Schéma DB, dépendances, structure dossiers
2. **OAuth plateformes** (Phase 2) - Connexion Lichess/Chess.com
3. **Récupération parties** (Phase 3) - Fetch et stockage
4. **Visualisation basique** (Phase 6 partiel) - Afficher parties, échiquier simple
5. **Analyse parties** (Phase 4) - Moteur d'analyse
6. **Génération exercices** (Phase 5) - Créer exercices depuis erreurs
7. **UI exercices** (Phase 5) - Player interactif
8. **Polish** (Phase 6) - Design, perf, features bonus

## Technologies clés

- **chess.js**: Parser PGN, logique de jeu
- **react-chessboard**: Composant échiquier (compatible React Native Web)
- **Stockfish.js** ou **API backend**: Analyse des positions
- **TanStack Query**: Cache et état des requêtes
- **Supabase Edge Functions**: Potentiel pour analyse server-side (optionnel)
