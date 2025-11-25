# Analyse complète : Backend, Analyse de parties et Création d'exercices

## 1. Architecture Backend (FastAPI + Stockfish)

### 1.1 Structure générale

Le backend est une application FastAPI qui expose des endpoints pour analyser des positions et des parties d'échecs via Stockfish.

**Fichiers principaux :**
- `backend/app/main.py` : Point d'entrée FastAPI
- `backend/app/models.py` : Modèles Pydantic pour requêtes/réponses
- `backend/app/routes/analyze.py` : Routes API
- `backend/app/services/analysis.py` : Service d'analyse de positions
- `backend/app/services/game_analysis.py` : Service d'analyse complète de parties
- `backend/app/services/stockfish_manager.py` : Gestionnaire du moteur Stockfish

### 1.2 Gestionnaire Stockfish (`StockfishManager`)

**Fonctionnalités :**
- Gère le cycle de vie d'une instance Stockfish unique (singleton)
- Utilise un verrou asyncio pour garantir l'accès thread-safe
- Réutilise la même instance Stockfish pour toutes les requêtes (performance)

**Points importants :**
```python
# Instance unique partagée
manager = StockfishManager(STOCKFISH_PATH)

# Accès exclusif via context manager
async with engine_manager.acquire() as engine:
    # Utilisation de l'engine
```

**Avantages :**
- Évite de démarrer/arrêter Stockfish à chaque requête
- Meilleure performance (pas de latence de démarrage)
- Gestion propre de la ressource

**Limitations potentielles :**
- Une seule requête à la fois (lock exclusif)
- Si Stockfish crash, toutes les requêtes échouent jusqu'à redémarrage

### 1.3 Endpoints API

#### `/analyze-position` (POST)
Analyse une position unique.

**Requête :**
```json
{
  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "depth": 15
}
```

**Réponse :**
```json
{
  "best_move": "e2e4",  // UCI
  "evaluation": 35,     // centipawns
  "evaluation_type": "cp",
  "depth": 15,
  "mate_in": null,
  "nodes": 123456,
  "analysis_time_ms": 842.5
}
```

#### `/analyze-game` (POST)
Analyse complète d'une partie (tous les coups).

**Requête :**
```json
{
  "pgn": "[Event \"...\"]\n1. e4 e5 ...",
  "depth": 13
}
```

**Réponse :**
```json
{
  "analyses": [
    {
      "move_number": 1,
      "fen": "...",
      "evaluation": 0.35,
      "best_move": "e2e4",
      "played_move": "e2e4",
      "move_quality": "best",
      "game_phase": "opening",
      "evaluation_loss": 0.0,
      "evaluation_type": "cp",
      "mate_in": null
    },
    // ... autres coups
  ]
}
```

#### `/classify-move` (POST)
Classe un coup unique dans une position.

**Requête :**
```json
{
  "fen": "...",
  "move_uci": "e2e4",
  "depth": 13
}
```

**Réponse :**
```json
{
  "move_quality": "best",
  "evaluation_loss": 0.0,
  "best_move": "e2e4",
  "opponent_best_move": "e7e5",
  "evaluation_before": 0.0,
  "evaluation_after": 0.35,
  "evaluation_type_after": "cp",
  "mate_in_after": null
}
```

### 1.4 Service d'analyse de positions (`analysis.py`)

**Fonction principale : `analyze_position()`**

**Processus :**
1. Exécute Stockfish dans un thread séparé (via `run_in_executor`)
2. Extrait le meilleur coup depuis `pv` (principal variation)
3. Extrait l'évaluation depuis `score.white()` (toujours du point de vue des blancs)
4. Gère les cas de mat (`mate_in`)

**Points critiques :**
- Utilise `score.white()` pour avoir une évaluation cohérente (toujours du point de vue des blancs)
- Gère les positions terminales (checkmate, stalemate, draw) via `handle_terminal_position()`

### 1.5 Service d'analyse de parties (`game_analysis.py`)

**Fonction principale : `analyze_game()`**

**Processus :**
1. Parse le PGN avec `chess.pgn.read_game()`
2. Pour chaque coup dans `game.mainline_moves()` :
   - Analyse la position avant le coup
   - Joue le coup
   - Analyse la position après le coup
   - Si le meilleur coup diffère, analyse aussi la position après le meilleur coup
   - Classe le coup avec `classify_move()`
3. Retourne une liste de `GameAnalysisResponse`

**Fonction `_analyze_move()` :**
- Évalue la position avant le coup
- Joue le coup
- Évalue la position après le coup
- Si le meilleur coup diffère, évalue aussi la position après le meilleur coup
- Classe le coup avec `classify_move()`

**Fonction `classify_move()` :**
- Détermine la phase de jeu (opening/middlegame/endgame) selon le numéro de coup
- Si le coup joué = meilleur coup → `"best"`
- Gère les cas de mat :
  - Si `mate_in_after < 0` → blunder (le joueur est maté)
  - Si `mate_in_after > 0` → compare avec le meilleur coup
- Sinon, calcule `evaluation_loss = abs(eval_after - eval_best_after)`
- Classification selon la perte :
  - `< 10cp` → `"excellent"`
  - `< 30cp` → `"good"`
  - `< 100cp` → `"inaccuracy"`
  - `< 300cp` → `"mistake"`
  - `>= 300cp` → `"blunder"`

**Points importants :**
- Les évaluations sont converties au point de vue du joueur qui joue (lignes 107-111)
- La perte d'évaluation est calculée en comparant avec le meilleur coup, pas avec la position avant

## 2. Flux d'analyse de parties (Frontend → Backend)

### 2.1 Hook `useAnalyzeGame`

**Fichier :** `hooks/useAnalyzeGame.ts`

**Processus :**
1. Appel à `analyzeGame()` (service frontend)
2. Conversion des analyses avec `prepareAnalysesForInsert()`
3. Sauvegarde via `dataService.saveAnalyses()`
4. Mise à jour du timestamp `analyzed_at`
5. Invalidation des caches React Query
6. Génération des exercices en différé (via `setTimeout`)

**Points importants :**
- La génération d'exercices est asynchrone et non-bloquante (100ms de délai)
- Gère le mode guest et authentifié

### 2.2 Service frontend `analyzer.ts`

**Fichier :** `services/chess/analyzer.ts`

**Fonction `analyzeGame()` :**
- Envoie une requête POST à `/analyze-game`
- Convertit les réponses du backend en format `GameAnalysis[]`
- Supporte un callback `onProgress` (mais actuellement appelé une seule fois à la fin)

**Fonction `prepareAnalysesForInsert()` :**
- Ajoute `game_id` à chaque analyse
- Prépare le format pour insertion DB

**Limitation actuelle :**
- Le `onProgress` n'est pas vraiment utile car le backend analyse tout d'un coup
- Pas de streaming ou de progression réelle

### 2.3 Hook `useAnalyzeGames`

**Fichier :** `hooks/useAnalyzeGames.ts`

**Fonctionnalités :**
- Analyse plusieurs parties séquentiellement
- Gère le progrès pour chaque partie
- Affiche une alerte à la fin

**Points importants :**
- Analyse séquentielle (pas parallèle) pour éviter de surcharger Stockfish
- Gère les erreurs par partie (continue même si une partie échoue)

### 2.4 Hook `useAutoAnalyze`

**Fichier :** `hooks/useAutoAnalyze.ts`

**Fonctionnalités :**
- Analyse automatiquement les parties si moins de 3 parties ont des exercices non complétés
- Vérifie toutes les 5 secondes
- Analyse dans l'ordre chronologique (plus récentes en premier)

**Logique :**
1. Compte les parties avec exercices non complétés
2. Si < 3, trouve la prochaine partie non analysée
3. Lance l'analyse

## 3. Création d'exercices

### 3.1 Flux général

1. **Analyse de partie** → génère des `GameAnalysis` avec `move_quality`
2. **Filtrage** → sélectionne uniquement les blunders (`move_quality === "blunder"`)
3. **Création d'exercices** → pour chaque blunder, crée un exercice
4. **Vérification de doublons** → évite de créer des exercices identiques
5. **Insertion** → sauvegarde dans la DB ou LocalStorage

### 3.2 Service de génération (`exercise-generator.ts`)

**Fichier :** `services/chess/exercise-generator.ts`

#### Fonction `createExerciseFromAnalysis()`

**Critères de création :**
1. `move_quality === "blunder"` (obligatoire)
2. `best_move` existe
3. `best_move !== played_move` (vérification UCI directe)

**Champs générés :**
- `user_id` : depuis `game.user_id`
- `game_id` : ID de la partie
- `game_analysis_id` : ID de l'analyse associée
- `fen` : position avant le coup
- `position_description` : description générée (ex: "Position après le coup 5 (blancs). Vous avez fait l'erreur : e2e4")
- `exercise_type` : toujours `"find_best_move"`
- `correct_move` : le `best_move` en UCI
- `hints` : hint généré (ex: "Déplacez le cavalier")

**Fonction `generateHint()` :**
- Extrait la pièce depuis le coup UCI
- Génère un hint basique : "Déplacez le {pièce}"

**Fonction `generateDescription()` :**
- Calcule le numéro de paire de coups
- Détermine si c'est blanc ou noir
- Format : "Position après le coup {pair} ({couleur}). Vous avez fait l'erreur : {move}"

#### Fonction `generateExercisesFromAnalyses()`

**Processus :**
1. Filtre les blunders
2. Pour chaque blunder, crée un exercice avec `createExerciseFromAnalysis()`
3. Vérifie l'existence dans la DB (évite les doublons)
4. Validation finale avec `compareMoves()` (sécurité supplémentaire)
5. Insertion en batch

**Vérification de doublons :**
- Clé : `(user_id, fen, correct_move)`
- Si un exercice existe déjà, skip

**Validation finale :**
- Utilise `compareMoves()` pour vérifier que `best_move !== played_move`
- Si égal, log une erreur et skip

#### Fonction `generateExercisesFromAnalysesGuest()`

Version pour le mode guest (LocalStorage).

**Différences :**
- Utilise `LocalStorage.getExercises()` au lieu de requête DB
- Utilise un Set pour vérifier les doublons
- Génère des UUIDs pour les IDs
- Ajoute `created_at` manuellement

### 3.3 Utilitaires (`exercise.ts`)

**Fichier :** `utils/exercise.ts`

#### Fonction `getUserUsernames()`

Normalise les usernames depuis les plateformes :
- Filtre les valeurs null
- Normalise (lowercase, trim, supprime espaces)

**Note :** Actuellement, la vérification `isUserMove()` est commentée dans `createExerciseFromAnalysis()`, donc tous les blunders génèrent des exercices, même ceux de l'adversaire.

#### Fonction `generateExercisesForGame()`

**Processus :**
1. Récupère les analyses depuis la DB
2. Vérifie que des usernames existent
3. Appelle `generateExercisesFromAnalyses()`
4. Invalide le cache des exercices

#### Fonction `generateExercisesForGameGuest()`

Version pour le mode guest :
- Récupère depuis LocalStorage
- Appelle `generateExercisesFromAnalysesGuest()`

### 3.4 Comparaison de coups (`move-comparison.ts`)

**Fichier :** `services/chess/move-comparison.ts`

**Fonctions :**
- `areUciMovesEqual()` : comparaison directe UCI (rapide)
- `areMovesEqual()` : comparaison en jouant les coups (précise)
- `compareMoves()` : méthode hybride (normalisation + comparaison précise)

**Utilisation :**
- Principalement pour la validation finale dans `exercise-generator.ts`
- Note : maintenant que tout est en UCI, `areUciMovesEqual()` serait plus efficace

## 4. Points d'attention et améliorations possibles

### 4.1 Backend

**Performance :**
- ✅ Réutilisation de Stockfish (bon)
- ⚠️ Lock exclusif = une seule requête à la fois
- 💡 Suggestion : pool de plusieurs instances Stockfish pour parallélisation

**Gestion d'erreurs :**
- ✅ Gestion des positions terminales
- ✅ Gestion des erreurs Stockfish
- ⚠️ Si Stockfish crash, toutes les requêtes échouent
- 💡 Suggestion : redémarrage automatique de Stockfish

**Progression :**
- ⚠️ Pas de streaming de progression pour `/analyze-game`
- 💡 Suggestion : WebSocket ou Server-Sent Events pour la progression

### 4.2 Analyse de parties

**Classification des coups :**
- ✅ Logique solide pour la classification
- ⚠️ Seuils fixes (10, 30, 100, 300 cp) - pourraient être adaptatifs selon le niveau
- ⚠️ Phase de jeu basée uniquement sur le numéro de coup (pas sur la position réelle)

**Gestion des mats :**
- ✅ Gestion correcte des cas de mat
- ⚠️ Perte fixe de 10000cp pour mat subi (arbitraire)

### 4.3 Création d'exercices

**Filtrage :**
- ⚠️ Seulement les blunders génèrent des exercices
- 💡 Suggestion : permettre aussi les mistakes ou inaccuracies selon préférences utilisateur
- ⚠️ `isUserMove()` est commentée → génère des exercices pour tous les blunders
- 💡 Suggestion : réactiver la vérification ou la rendre optionnelle

**Hints :**
- ⚠️ Hints très basiques ("Déplacez le {pièce}")
- 💡 Suggestion : hints plus contextuels (ex: "Contrôlez la case centrale", "Défendez votre roi")

**Description :**
- ⚠️ Description utilise le coup joué en UCI (pas très lisible)
- 💡 Suggestion : convertir en SAN pour la description

**Doublons :**
- ✅ Vérification de doublons par (user_id, fen, correct_move)
- ⚠️ Si même position mais meilleur coup différent, crée plusieurs exercices
- 💡 Suggestion : peut-être limiter à un exercice par position ?

**Performance :**
- ⚠️ Vérification de doublons une par une (requêtes DB séquentielles)
- 💡 Suggestion : batch check ou index DB sur (user_id, fen, correct_move)

### 4.4 Frontend

**Génération différée :**
- ✅ Génération asynchrone (non-bloquante)
- ⚠️ Délai fixe de 100ms (arbitraire)
- 💡 Suggestion : queue de génération avec retry en cas d'échec

**Gestion d'erreurs :**
- ✅ Logs silencieux (ne bloque pas l'utilisateur)
- ⚠️ Pas de notification si la génération échoue
- 💡 Suggestion : notification discrète ou retry automatique

**Mode guest :**
- ✅ Support complet du mode guest
- ⚠️ Génération d'UUIDs côté client (pas de garantie d'unicité globale)
- 💡 Suggestion : utiliser un compteur ou hash pour les IDs guest

## 5. Flux de données complet

```
1. Utilisateur demande l'analyse d'une partie
   ↓
2. Frontend: useAnalyzeGame() → analyzeGame()
   ↓
3. Frontend: POST /analyze-game avec PGN
   ↓
4. Backend: analyze_game_endpoint()
   ↓
5. Backend: analyze_game() → parse PGN → pour chaque coup:
   - _analyze_move() → _evaluate_position() × 2-3 fois
   - classify_move()
   ↓
6. Backend: Retourne liste de GameAnalysisResponse
   ↓
7. Frontend: prepareAnalysesForInsert() → ajoute game_id
   ↓
8. Frontend: dataService.saveAnalyses() → insert DB
   ↓
9. Frontend: setTimeout(100ms) → generateExercisesForGame()
   ↓
10. Frontend: Récupère analyses depuis DB
    ↓
11. Frontend: generateExercisesFromAnalyses()
    ↓
12. Frontend: Filtre blunders → createExerciseFromAnalysis()
    ↓
13. Frontend: Vérifie doublons (requête DB par exercice)
    ↓
14. Frontend: Insert exercices en batch
    ↓
15. Frontend: Invalide cache React Query
```

## 6. Formats de données

### 6.1 Coups (Moves)

**Format utilisé : UCI** (Universal Chess Interface)
- Exemple : `"e2e4"`, `"g1f3"`, `"e7e8q"` (promotion)
- Avantages : standard, non ambigu, facile à comparer
- Stockage : DB et backend utilisent UCI

**Conversion SAN :**
- Pas de conversion automatique côté backend
- Frontend peut convertir avec chess.js si nécessaire pour l'affichage

### 6.2 Évaluations

**Backend → Frontend :**
- Backend retourne en centipawns (int)
- Frontend convertit en pawns (float) pour la DB : `evaluation / 100.0`
- DB stocke en pawns (float)

**Point de vue :**
- Toujours du point de vue des blancs (via `score.white()`)
- Conversion au point de vue du joueur dans `classify_move()` si nécessaire

### 6.3 Types de données

**GameAnalysis (DB) :**
```typescript
{
  id: string;
  game_id: string;
  move_number: number;
  fen: string;
  evaluation: number; // pawns
  best_move: string | null; // UCI
  played_move: string; // UCI
  move_quality: "best" | "excellent" | "good" | "inaccuracy" | "mistake" | "blunder";
  game_phase: "opening" | "middlegame" | "endgame";
  evaluation_loss: number; // centipawns
  evaluation_type: "cp" | "mate" | null;
  mate_in: number | null;
  created_at: string;
}
```

**Exercise (DB) :**
```typescript
{
  id: string;
  user_id: string;
  game_id: string | null;
  game_analysis_id: string | null;
  fen: string;
  position_description: string;
  exercise_type: "find_best_move";
  correct_move: string; // UCI
  hints: string[] | null;
  difficulty: number | null;
  completed: boolean;
  score: number;
  attempts: number;
  completed_at: string | null;
  created_at: string;
}
```

## 7. Conclusion

**Points forts :**
- Architecture claire et modulaire
- Réutilisation de Stockfish (performance)
- Gestion correcte des cas de mat
- Support mode guest et authentifié
- Vérification de doublons pour les exercices

**Points à améliorer :**
- Parallélisation des analyses (pool Stockfish)
- Streaming de progression pour les analyses longues
- Hints plus contextuels pour les exercices
- Filtrage optionnel des exercices (pas seulement blunders)
- Réactivation de `isUserMove()` ou option pour filtrer
- Batch check des doublons (performance)
- Conversion SAN pour les descriptions d'exercices


