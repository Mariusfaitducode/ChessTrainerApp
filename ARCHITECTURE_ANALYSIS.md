# Analyse de l'Architecture et des Requêtes

## 📊 Bilan des Requêtes au Démarrage

### Requêtes au chargement de l'application

#### 1. **Page Games (`games.tsx`)**

- `useGames()` → `["games"]`
  - 1 requête: `SELECT * FROM games ORDER BY played_at DESC`
  - 1 requête: `SELECT game_id, mistake_level FROM game_analyses WHERE game_id IN (...)`
  - N requêtes (parallèles): `UPDATE games SET analyzed_at = ... WHERE id = ...` (si désynchronisation)
- `useChessPlatform()` → `["user-platforms"]`
  - 1 requête: `SELECT * FROM user_platforms WHERE user_id = ...`
- `useSyncGames()` → Pas de requête au démarrage (seulement au clic)

**Total: ~3-5 requêtes** (selon nombre de parties à synchroniser)

#### 2. **Page Exercises (`exercises.tsx`)**

- `useExercises()` → `["exercises", completed, platforms]`
  - 1 requête: `SELECT * FROM exercises WHERE completed = ... ORDER BY created_at DESC`
  - **N requêtes (séquentielles)**: Pour chaque exercice:
    - `SELECT * FROM games WHERE id = ...` (si `game_id` existe)
    - `SELECT * FROM game_analyses WHERE id = ...` (si `game_analysis_id` existe)
    - `SELECT * FROM game_analyses WHERE game_id = ... AND move_number = ...` (pour l'analyse précédente)
- `useChessPlatform()` → `["user-platforms"]` (déjà chargé si on vient de Games)

**Total: 1 + (N × 3) requêtes** où N = nombre d'exercices

- **Problème majeur**: Si 50 exercices → **151 requêtes** !

#### 3. **Page Game Detail (`game/[id].tsx`)**

- `useGame(gameId)` → 3 requêtes en parallèle:
  - `["game-metadata", gameId]`: `SELECT id, platform, ... FROM games WHERE id = ...`
  - `["game-pgn", gameId]`: `SELECT pgn FROM games WHERE id = ...`
  - `["game-analyses", gameId]`: `SELECT id, game_id, ... FROM game_analyses WHERE game_id = ...`
- `useChessPlatform()` → `["user-platforms"]` (déjà chargé)

**Total: 3 requêtes** ✅ (optimisé)

#### 4. **Page Exercise Detail (`exercise/[id].tsx`)**

- `useExercise(exerciseId)` → `["exercise", exerciseId, platforms]`
  - 1 requête: `SELECT * FROM exercises WHERE id = ...`
  - 1 requête: `SELECT * FROM games WHERE id = ...` (si `game_id` existe)
  - 1 requête: `SELECT * FROM game_analyses WHERE id = ...` (si `game_analysis_id` existe)
  - 1 requête: `SELECT * FROM game_analyses WHERE game_id = ... AND move_number = ...` (analyse précédente)
- `useExercises(false)` → `["exercises", false, platforms]` (pour navigation)
  - **Même problème que la page Exercises**: N × 3 requêtes
- `useChessPlatform()` → `["user-platforms"]` (déjà chargé)
- `useQuery(["exercise-analysis", game_analysis_id])`
  - 1 requête: `SELECT evaluation, best_move, mistake_level FROM game_analyses WHERE id = ...`

**Total: 4 + (N × 3) requêtes** où N = nombre d'exercices non complétés

---

## 🏗️ Architecture Actuelle

### Structure des Données

```
┌─────────────────┐
│   user_platforms│
│  - id           │
│  - user_id      │
│  - platform     │
│  - username     │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐
│      games      │
│  - id           │
│  - user_id      │
│  - platform     │
│  - pgn          │
│  - white_player │
│  - black_player │
└────────┬────────┘
         │
         │ 1:N                    │ 1:N
         ▼                        ▼
┌─────────────────┐      ┌─────────────────┐
│ game_analyses   │      │   exercises     │
│  - id           │      │  - id            │
│  - game_id      │◄─────┤  - game_id       │
│  - move_number  │      │  - game_analysis│
│  - fen          │      │  - fen          │
│  - evaluation   │      │  - correct_move │
│  - best_move    │      │  - hints        │
│  - mistake_level│      │  - completed    │
└─────────────────┘      └─────────────────┘
```

### Flux de Données

1. **Synchronisation** (`useSyncGames`)
   - Appel API externe (Chess.com/Lichess)
   - Insertion en DB via Supabase Client
   - Invalidation cache React Query

2. **Analyse** (`useAnalyzeGame` / `useAnalyzeGames`)
   - Appel API Chess-API.com (Stockfish)
   - Insertion analyses en DB
   - Génération exercices (différé)

3. **Affichage**
   - React Query cache les requêtes
   - Enrichissement côté client (opponent, evaluation_loss)

---

## ⚠️ Problèmes Identifiés

### 1. **N+1 Query Problem dans `useExercises`**

**Problème**: Pour chaque exercice, on fait 3 requêtes séparées:

```typescript
// Dans useExercises.ts
data.map(async (exercise) => {
  // Requête 1: game
  const { data: game } = await supabase.from("games").select("*").eq("id", exercise.game_id).single();

  // Requête 2: analysis
  const { data: analysis } = await supabase.from("game_analyses").select("*").eq("id", exercise.game_analysis_id).single();

  // Requête 3: previous analysis
  const { data: previousAnalysis } = await supabase.from("game_analyses").select("*").eq("game_id", ...).eq("move_number", ...).single();
});
```

**Impact**:

- 50 exercices = 151 requêtes
- Latence élevée
- Coût Supabase (requêtes payantes)

**Solution**: Utiliser des JOINs ou des requêtes batch

### 2. **Duplication de Logique**

- `useExercise` et `useExercises` ont la même logique d'enrichissement
- Calcul de `evaluation_loss` dupliqué
- Détermination de `opponent` dupliquée

### 3. **Types Manuels vs Types Supabase**

- Types dans `types/games.ts` et `types/exercises.ts` sont manuels
- Risque de désynchronisation avec la DB
- Pas de type-safety pour les requêtes Supabase

### 4. **Synchronisation `analyzed_at`**

- `useGames` fait des updates en parallèle pour synchroniser `analyzed_at`
- Logique complexe et fragile
- Devrait être géré par un trigger DB ou une fonction

---

## 💡 Solutions Proposées

### Solution 1: Optimiser les Requêtes avec JOINs

**Avant** (N+1):

```typescript
// 1 requête + N×3 requêtes
const exercises = await supabase.from("exercises").select("*");
for (const ex of exercises) {
  const game = await supabase
    .from("games")
    .select("*")
    .eq("id", ex.game_id)
    .single();
  const analysis = await supabase
    .from("game_analyses")
    .select("*")
    .eq("id", ex.game_analysis_id)
    .single();
  // ...
}
```

**Après** (1 requête avec JOINs):

```typescript
// 1 seule requête avec tous les JOINs
const { data } = await supabase.from("exercises").select(`
    *,
    games (*),
    game_analyses!exercises_game_analysis_id_fkey (*),
    previous_analysis:game_analyses!game_id (
      *
    )
  `);
```

**Gain**: 151 requêtes → 1 requête

### Solution 2: Créer des Views ou Functions Supabase

**Option A: View SQL**

```sql
CREATE VIEW exercises_enriched AS
SELECT
  e.*,
  g.white_player,
  g.black_player,
  ga.evaluation,
  ga.move_number,
  prev_ga.evaluation as prev_evaluation
FROM exercises e
LEFT JOIN games g ON e.game_id = g.id
LEFT JOIN game_analyses ga ON e.game_analysis_id = ga.id
LEFT JOIN game_analyses prev_ga ON ga.game_id = prev_ga.game_id
  AND prev_ga.move_number = ga.move_number - 1;
```

**Option B: Function Supabase (Edge Function ou Postgres Function)**

```sql
CREATE OR REPLACE FUNCTION get_exercises_enriched(user_id_param UUID, completed_param BOOLEAN DEFAULT NULL)
RETURNS TABLE (...) AS $$
BEGIN
  -- Logique d'enrichissement côté serveur
END;
$$ LANGUAGE plpgsql;
```

### Solution 3: Utiliser les Types Supabase Générés

**Avant**:

```typescript
// types/games.ts (manuel)
export interface Game {
  id: string;
  user_id: string;
  // ...
}
```

**Après**:

```typescript
// types/database.ts (généré depuis Supabase)
import type { Database } from "@/types/supabase";

export type Game = Database["public"]["Tables"]["games"]["Row"];
export type GameAnalysis = Database["public"]["Tables"]["game_analyses"]["Row"];
export type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
```

**Avantages**:

- Synchronisation automatique avec la DB
- Type-safety pour les requêtes
- Auto-complétion dans l'IDE

---

## 🤔 Backend ou Pas Backend ?

### Arguments CONTRE un Backend

1. **Supabase est déjà un Backend**
   - Auth, DB, Storage, Functions
   - Pas besoin de serveur supplémentaire

2. **Coût**
   - Backend = serveur à maintenir
   - Supabase = pay-as-you-go

3. **Complexité**
   - Moins de code à maintenir
   - Pas de déploiement serveur

4. **Performance**
   - Supabase est optimisé
   - Edge Functions pour la logique serveur

### Arguments POUR un Backend

1. **Logique Métier Complexe**
   - Analyse de parties (actuellement côté client)
   - Génération d'exercices (actuellement côté client)
   - Calculs lourds

2. **Sécurité**
   - Clés API Chess-API.com exposées côté client
   - Rate limiting difficile côté client

3. **Optimisation**
   - Cache côté serveur
   - Batch processing
   - Queue system (pour analyses longues)

4. **Scalabilité**
   - Si beaucoup d'utilisateurs
   - Traitement asynchrone (workers)

### Recommandation: **Backend Hybride**

**Garder Supabase pour**:

- Auth
- DB (Postgres)
- Storage
- Real-time (si besoin)

**Ajouter Backend (Node.js/TypeScript) pour**:

- Analyse de parties (appel Chess-API.com)
- Génération d'exercices
- Queue system (BullMQ/Redis)
- Cache (Redis)

**Architecture proposée**:

```
Client (React Native)
  ↓
Supabase (Auth, DB, Storage)
  ↓
Backend API (Node.js)
  ├─ Queue (BullMQ)
  ├─ Workers (analyse parties)
  └─ Cache (Redis)
```

**Avantages**:

- Sécurité (clés API côté serveur)
- Performance (cache, queue)
- Scalabilité (workers)
- Garde Supabase (pas de migration DB)

---

## 📋 Plan d'Action

### Phase 1: Optimisation Immédiate (Sans Backend)

1. ✅ **Utiliser les types Supabase générés**
   - Remplacer `types/games.ts` et `types/exercises.ts`
   - Créer `types/database.ts` qui exporte depuis `supabase.ts`

2. ✅ **Optimiser `useExercises` avec JOINs**
   - Une seule requête avec tous les JOINs
   - Réduire de 151 → 1 requête

3. ✅ **Créer une View SQL pour `exercises_enriched`**
   - Calculs côté DB
   - Réduire la logique côté client

4. ✅ **Centraliser la logique d'enrichissement**
   - Créer `utils/exercise-enrichment.ts`
   - Réutiliser dans `useExercise` et `useExercises`

### Phase 2: Backend (Si Nécessaire)

1. **Créer Backend API (Node.js/Express)**
   - Endpoints: `/api/analyze`, `/api/generate-exercises`
   - Queue system (BullMQ)

2. **Migrer l'analyse côté serveur**
   - Appels Chess-API.com depuis le backend
   - Workers pour traiter les analyses

3. **Cache Redis**
   - Cache des analyses
   - Cache des exercices enrichis

---

## 📊 Métriques Actuelles

### Requêtes au Démarrage (Page Games)

- **3-5 requêtes** ✅ Acceptable

### Requêtes au Démarrage (Page Exercises)

- **1 + (N × 3) requêtes** ❌ Problématique
- Si N=50 → **151 requêtes**

### Requêtes au Démarrage (Page Exercise Detail)

- **4 + (N × 3) requêtes** ❌ Problématique
- Si N=50 → **154 requêtes**

### Coût Supabase

- **~200 requêtes** pour afficher 50 exercices
- Avec 1000 utilisateurs → **200,000 requêtes/jour**
- Supabase Free: 500,000 requêtes/mois
- **Risque de dépassement**

---

## 🎯 Priorités

1. **URGENT**: Optimiser `useExercises` (N+1 problem)
2. **IMPORTANT**: Utiliser types Supabase générés
3. **MOYEN**: Créer View SQL pour enrichissement
4. **FUTUR**: Backend si scalabilité nécessaire

