# Analyse : Synchronisation et Analyse des Parties

## Vue d'ensemble

Le système de synchronisation et d'analyse des parties fonctionne en deux phases distinctes mais coordonnées :

1. **Synchronisation** : Récupération des parties depuis les plateformes (Chess.com, Lichess)
2. **Analyse** : Analyse des parties et génération d'exercices

---

## 1. Synchronisation des Parties (`useAutoSync`)

### Architecture

```12:156:hooks/useAutoSync.ts
const INITIAL_SYNC_GAMES = 10;

/**
 * Hook pour la synchronisation automatique des parties
 * - Charge les 10 premières parties au démarrage
 * - Vérifie les nouvelles parties quand l'application devient active
 * - Ne charge que les parties plus récentes que la date de référence
 */
export const useAutoSync = () => {
  // ...
}
```

### Flux de synchronisation

#### Phase 1 : Synchronisation initiale

- **Déclenchement** : Au démarrage de l'application, si `games.length === 0` et que des plateformes sont configurées
- **Action** : Charge les **10 premières parties** (`INITIAL_SYNC_GAMES = 10`)
- **Méthode** : `syncGames({ maxGames: 10 })`
- **Stockage** : La date de la partie la plus récente est sauvegardée dans `AsyncStorage` (`latest_game_date`)

#### Phase 2 : Vérification des nouvelles parties

- **Déclenchement** :
  1. Quand l'application passe de `inactive|background` à `active` (via `AppState.addEventListener`)
  2. 2 secondes après chaque changement de `games.length` (timeout de sécurité)
- **Action** : Vérifie les parties plus récentes que la date de référence
- **Méthode** : `syncGames({ maxGames: 50, since: referenceDate })`
- **Filtrage** : Ne récupère que les parties avec `played_at > referenceDate`

### Gestion de la date de référence

```16:29:hooks/useAutoSync.ts
const getLatestGameDate = async (games: Game[]): Promise<number | null> => {
  if (games.length === 0) return null;

  const sortedGames = [...games].sort((a, b) => {
    const dateA = a.played_at ? new Date(a.played_at).getTime() : 0;
    const dateB = b.played_at ? new Date(b.played_at).getTime() : 0;
    return dateB - dateA;
  });

  const latestGame = sortedGames[0];
  if (!latestGame?.played_at) return null;

  return new Date(latestGame.played_at).getTime();
};
```

- **Source primaire** : Date de la partie la plus récente dans `games` (triée par `played_at` décroissant)
- **Source secondaire** : `AsyncStorage` si aucune partie n'est chargée
- **Persistance** : Sauvegardée automatiquement après chaque chargement de parties

### Protection contre les doublons

```104:127:hooks/useAutoSync.ts
  const checkForNewGames = useCallback(async () => {
    if (games.length === 0 || platforms.length === 0 || isCheckingRef.current) {
      return;
    }

    isCheckingRef.current = true;

    const referenceDate = await getReferenceDate();
    if (!referenceDate) {
      isCheckingRef.current = false;
      return;
    }

    try {
      await syncGames({
        maxGames: 50,
        since: referenceDate,
      });
    } catch {
      // Ignore errors
    } finally {
      isCheckingRef.current = false;
    }
  }, [platforms.length, games.length, syncGames, getReferenceDate]);
```

- **Ref `isCheckingRef`** : Empêche les vérifications concurrentes
- **Filtrage par date** : `since` garantit qu'on ne récupère que les parties futures
- **Détection de doublons** : `useSyncGames` vérifie les `platform_game_id` existants avant insertion

---

## 2. Synchronisation des Plateformes (`useSyncGames`)

### Support multi-plateformes

```46:98:hooks/useSyncGames.ts
  const syncGames = useMutation({
    mutationFn: async ({
      maxGames = 50,
      platform,
      since,
    }: {
      maxGames?: number;
      platform?: Platform;
      since?: number; // Timestamp de référence : ne récupérer que les parties plus récentes
    } = {}) => {
      // ...
      for (const userPlatform of platformsToSync) {
        try {
          // Récupérer les parties depuis l'API
          let apiGames: (ChessComGame | LichessGame)[] = [];

          if (userPlatform.platform === "chesscom") {
            const months = Math.ceil(maxGames / 50);
            apiGames = await getAllPlayerGames(
              userPlatform.platform_username,
              Math.min(months, 12),
            );

            // Filtrer par date si since est fourni
            if (since) {
              const sinceDate = new Date(since);
              apiGames = apiGames.filter((game) => {
                const gameDate = getGameDate(game);
                return gameDate > sinceDate;
              });
            }

            apiGames = apiGames.slice(0, maxGames);
          } else if (userPlatform.platform === "lichess") {
            apiGames = await getUserGames(
              userPlatform.platform_username,
              maxGames,
              since,
            );
          }
```

### Différences entre plateformes

#### Chess.com

- **API** : `getAllPlayerGames(username, months)` - récupère par mois (max 12 mois)
- **Filtrage** : Client-side après récupération (pas de paramètre `since` dans l'API)
- **Date** : `end_time` (timestamp en secondes) → converti en millisecondes

#### Lichess

- **API** : `getUserGames(username, maxGames, since)` - supporte directement le paramètre `since`
- **Filtrage** : Server-side via l'API
- **Date** : `lastMoveAt` (timestamp en millisecondes)

### Extraction de date type-safe

```18:26:hooks/useSyncGames.ts
const getGameDate = (game: ChessComGame | LichessGame): Date => {
  if ("end_time" in game) {
    // Chess.com: end_time est en secondes
    return new Date(game.end_time * 1000);
  } else {
    // Lichess: lastMoveAt est en millisecondes
    return new Date(game.lastMoveAt);
  }
};
```

### Détection des doublons

```116:135:hooks/useSyncGames.ts
          // Récupérer les parties existantes pour détecter les doublons
          const existingGames = await dataService.getGames();
          const existingIds = new Set(
            existingGames.map((g) => `${g.platform}_${g.platform_game_id}`),
          );

          // Filtrer les nouvelles parties
          const newGames = gamesToInsert.filter(
            (g) => !existingIds.has(`${g.platform}_${g.platform_game_id}`),
          );

          if (newGames.length === 0) {
            totalSkipped += gamesToInsert.length;
            continue;
          }

          // Ajouter les nouvelles parties via le service unifié
          for (const game of newGames) {
            await dataService.addGame(game);
          }
```

- **Clé unique** : `${platform}_${platform_game_id}`
- **Insertion** : Uniquement les parties non existantes
- **Compteurs** : `imported` (nouvelles), `skipped` (déjà existantes), `errors` (échecs)

---

## 3. Analyse Automatique (`useAutoAnalyze`)

### Stratégie d'analyse

```6:87:hooks/useAutoAnalyze.ts
const MIN_GAMES_WITH_EXERCISES = 3;
const CHECK_INTERVAL = 5000; // 5 secondes

/**
 * Hook pour analyser automatiquement les parties
 * - Vérifie le nombre de parties avec exercices non complétés
 * - Si < 3, analyse la prochaine partie non analysée dans l'ordre chronologique
 * - Les parties sont triées par date (played_at) décroissante (plus récentes en premier)
 */
export const useAutoAnalyze = () => {
  // ...
  useEffect(() => {
    // Éviter les vérifications trop fréquentes
    const now = Date.now();
    if (now - lastCheckRef.current < CHECK_INTERVAL) {
      return;
    }
    lastCheckRef.current = now;

    // Ne rien faire si on charge ou si on est déjà en train d'analyser
    if (
      isLoadingGames ||
      isLoadingExercises ||
      isAnalyzing ||
      isAnalyzingRef.current ||
      games.length === 0
    ) {
      return;
    }

    // Compter les parties avec exercices non complétés
    const gamesWithExercises = new Set(
      exercises.map((ex) => ex.game_id).filter((id): id is string => !!id),
    );
    const countGamesWithExercises = gamesWithExercises.size;

    // Si on a assez de parties avec exercices, ne rien faire
    if (countGamesWithExercises >= MIN_GAMES_WITH_EXERCISES) {
      return;
    }

    // Trier les parties par date décroissante (plus récentes en premier)
    // Cela garantit qu'on analyse dans l'ordre chronologique
    const sortedGames = [...games].sort((a, b) => {
      const dateA = a.played_at ? new Date(a.played_at).getTime() : 0;
      const dateB = b.played_at ? new Date(b.played_at).getTime() : 0;
      return dateB - dateA; // Décroissant (plus récentes en premier)
    });

    // Trouver la prochaine partie non analysée dans l'ordre chronologique
    const nextUnanalyzedGame = sortedGames.find(
      (game) => !game.analyzed_at && game.pgn,
    );

    if (!nextUnanalyzedGame) {
      return;
    }

    // Lancer l'analyse
    isAnalyzingRef.current = true;
    analyzeGames({ games: [nextUnanalyzedGame] })
      .then(() => {
        isAnalyzingRef.current = false;
      })
      .catch(() => {
        isAnalyzingRef.current = false;
      });
  }, [
    games,
    exercises,
    isLoadingGames,
    isLoadingExercises,
    isAnalyzing,
    analyzeGames,
  ]);
};
```

### Conditions de déclenchement

1. **Vérification périodique** : Toutes les 5 secondes maximum (`CHECK_INTERVAL`)
2. **État requis** :
   - `!isLoadingGames` : Les parties doivent être chargées
   - `!isLoadingExercises` : Les exercices doivent être chargés
   - `!isAnalyzing` : Aucune analyse en cours
   - `!isAnalyzingRef.current` : Protection contre les déclenchements concurrents
   - `games.length > 0` : Au moins une partie disponible

3. **Condition métier** : `countGamesWithExercises < MIN_GAMES_WITH_EXERCISES` (3)

4. **Partie cible** : La première partie non analysée (`!analyzed_at`) avec PGN, dans l'ordre chronologique décroissant

### Ordre d'analyse

- **Tri** : Par `played_at` décroissant (plus récentes en premier)
- **Sélection** : `find()` retourne la première partie non analysée
- **Résultat** : Analyse les parties dans l'ordre chronologique (plus récentes d'abord)

---

## 4. Analyse des Parties (`useAnalyzeGames`)

### Processus d'analyse

```38:175:hooks/useAnalyzeGames.ts
  const analyzeGames = useMutation({
    mutationFn: async ({
      games,
      options = {},
    }: {
      games: Game[];
      options?: AnalyzeGamesOptions;
    }) => {
      if (games.length === 0) {
        throw new Error("Aucune partie à analyser");
      }

      const depth = options.depth ?? 13;
      const results: {
        gameId: string;
        success: boolean;
        error?: string;
      }[] = [];

      // Initialiser le progress
      const initialProgress: Record<string, Progress> = {};
      games.forEach((game) => {
        initialProgress[game.id] = {
          gameId: game.id,
          current: 0,
          total: 0,
          completed: false,
        };
      });
      setProgress(initialProgress);

      // Analyser les parties séquentiellement
      for (const game of games) {
        try {
          if (!game.pgn) {
            results.push({
              gameId: game.id,
              success: false,
              error: "PGN manquant",
            });
            continue;
          }

          const analyses = await analyzeGame(game.pgn, {
            depth,
            onProgress: (current, total) => {
              setProgress((prev) => ({
                ...prev,
                [game.id]: {
                  gameId: game.id,
                  current,
                  total,
                  completed: false,
                },
              }));
            },
          });

          if (analyses.length === 0) {
            throw new Error("Aucune analyse générée");
          }

          // Préparer les analyses pour insertion
          const analysesToInsert = prepareAnalysesForInsert(game.id, analyses);

          // Sauvegarder via le service unifié
          await dataService.saveAnalyses(game.id, analysesToInsert);
          await dataService.updateGameAnalyzedAt(
            game.id,
            new Date().toISOString(),
          );

          setProgress((prev) => ({
            ...prev,
            [game.id]: {
              gameId: game.id,
              current: analyses.length,
              total: analyses.length,
              completed: true,
            },
          }));

          // Invalider les caches
          queryClient.invalidateQueries({
            queryKey: ["game-analyses", game.id],
          });
          queryClient.invalidateQueries({ queryKey: ["games"] });
          queryClient.invalidateQueries({
            queryKey: ["game-metadata", game.id],
          });

          // Générer les exercices en différé
          setTimeout(() => {
            if (isGuest) {
              generateExercisesForGameGuest(
                game.id,
                game,
                platforms,
                queryClient,
                "useAnalyzeGames",
              );
            } else {
              generateExercisesForGame(
                supabase,
                game.id,
                game,
                platforms,
                queryClient,
                "useAnalyzeGames",
              );
            }
          }, 100);

          results.push({ gameId: game.id, success: true });
        } catch (error: any) {
          // ...
        }
      }

      return results;
    },
```

### Étapes d'analyse

1. **Validation** : Vérifie que la partie a un PGN
2. **Analyse** : Appelle `analyzeGame(pgn, { depth: 13 })` avec callback de progression
3. **Sauvegarde** :
   - Insère les analyses via `dataService.saveAnalyses()`
   - Met à jour `analyzed_at` via `dataService.updateGameAnalyzedAt()`
4. **Invalidation** : Invalide les caches React Query
5. **Génération d'exercices** : Déclenche `generateExercisesForGame()` en différé (100ms)

### Génération d'exercices

```129:149:hooks/useAnalyzeGames.ts
          // Générer les exercices en différé
          setTimeout(() => {
            if (isGuest) {
              generateExercisesForGameGuest(
                game.id,
                game,
                platforms,
                queryClient,
                "useAnalyzeGames",
              );
            } else {
              generateExercisesForGame(
                supabase,
                game.id,
                game,
                platforms,
                queryClient,
                "useAnalyzeGames",
              );
            }
          }, 100);
```

- **Délai** : 100ms après la sauvegarde des analyses (pour garantir que les analyses sont disponibles)
- **Mode** : Différencie guest (`generateExercisesForGameGuest`) et authentifié (`generateExercisesForGame`)
- **Source** : Récupère les analyses depuis la DB/LocalStorage, filtre les blunders, crée les exercices

---

## 5. Intégration dans le Dashboard

```90:94:app/(protected)/(tabs)/index.tsx
  // Synchronisation automatique : charge les 10 premières parties puis vérifie périodiquement
  useAutoSync();

  // Analyse automatique : analyse la prochaine partie si moins de 3 parties avec exercices
  useAutoAnalyze();
```

- **Appel simple** : Les deux hooks sont appelés sans paramètres
- **Automatique** : Fonctionnent en arrière-plan sans intervention utilisateur
- **Indépendants** : Peuvent fonctionner en parallèle (sync et analyse simultanées)

---

## 6. Points d'attention et améliorations possibles

### Points forts

1. **Synchronisation incrémentale** : Ne récupère que les nouvelles parties via `since`
2. **Protection contre les doublons** : Vérification par `platform_game_id`
3. **Gestion d'état** : Refs pour éviter les déclenchements concurrents
4. **Persistance** : `AsyncStorage` pour la date de référence
5. **Ordre chronologique** : Analyse des parties les plus récentes en premier

### Points d'amélioration

1. **CHECK_INTERVAL fixe** : `useAutoAnalyze` vérifie toutes les 5 secondes même si rien ne change
   - **Suggestion** : Utiliser un système d'événements (quand une partie est analysée, vérifier immédiatement)

2. **Timeout de 2 secondes** : Dans `useAutoSync`, le timeout après changement de `games.length` est arbitraire
   - **Suggestion** : Utiliser un debounce ou un système d'événements

3. **Génération d'exercices en différé** : Le `setTimeout(100ms)` est fragile
   - **Suggestion** : Utiliser un système de retry ou vérifier que les analyses sont disponibles

4. **Pas de retry** : En cas d'échec de sync ou d'analyse, pas de mécanisme de retry automatique
   - **Suggestion** : Implémenter un système de retry avec backoff exponentiel

5. **Alertes silencieuses** : `useAutoSync` avec `silent: true` masque les erreurs
   - **Suggestion** : Logger les erreurs pour le debugging

6. **Performance** : `useAutoAnalyze` recalcule `gamesWithExercises` à chaque render
   - **Suggestion** : Utiliser `useMemo` pour optimiser

---

## 7. Flux complet

```
┌─────────────────────────────────────────────────────────────┐
│                    DÉMARRAGE APPLICATION                    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │   useAutoSync (initial)       │
        │   - games.length === 0        │
        │   - Charge 10 parties          │
        └───────────────┬───────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │   Sauvegarde latest_game_date  │
        │   (AsyncStorage)               │
        └───────────────┬───────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │   useAutoAnalyze               │
        │   - countGamesWithExercises < 3│
        │   - Trouve partie non analysée │
        └───────────────┬───────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │   useAnalyzeGames             │
        │   - Analyse PGN (depth 13)    │
        │   - Sauvegarde analyses       │
        └───────────────┬───────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │   generateExercisesForGame    │
        │   - Filtre blunders           │
        │   - Crée exercices            │
        └───────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              APP STATE CHANGE (background → active)        │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │   useAutoSync (check)          │
        │   - Récupère referenceDate    │
        │   - syncGames({ since })       │
        └───────────────┬───────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │   Filtre parties > referenceDate│
        │   - Détecte doublons          │
        │   - Insère nouvelles parties  │
        └───────────────┬───────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │   useAutoAnalyze (si < 3)      │
        │   - Analyse nouvelle partie    │
        └───────────────────────────────┘
```

---

## 8. Résumé

### Synchronisation

- **Initiale** : 10 parties au démarrage
- **Incrémentale** : Vérifie les nouvelles parties à chaque retour sur l'app
- **Filtrage** : Par date de référence (ne charge que les parties futures)
- **Protection** : Détection de doublons par `platform_game_id`

### Analyse

- **Automatique** : Déclenchée si < 3 parties avec exercices
- **Ordre** : Parties les plus récentes en premier
- **Processus** : Analyse PGN → Sauvegarde analyses → Génération exercices (blunders uniquement)
- **Fréquence** : Vérification toutes les 5 secondes maximum

### Coordination

- **Indépendance** : Sync et analyse peuvent fonctionner en parallèle
- **Dépendances** : Analyse nécessite des parties chargées
- **Cache** : React Query invalide les caches après chaque opération
