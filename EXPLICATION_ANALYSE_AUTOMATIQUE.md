# Explication : Comment les Analyses Automatiques se Déclenchent

## Vue d'ensemble

Le système d'analyse automatique fonctionne en arrière-plan pour maintenir un stock d'exercices disponible pour l'utilisateur. Voici comment ça fonctionne :

---

## 1. Déclenchement Automatique

### Hook : `useAutoAnalyze`

Le hook `useAutoAnalyze` est appelé dans le Dashboard et vérifie périodiquement s'il faut analyser une nouvelle partie.

### Conditions de déclenchement

L'analyse se déclenche automatiquement si **TOUTES** ces conditions sont remplies :

1. **Vérification périodique** : Toutes les 5 secondes maximum (`CHECK_INTERVAL`)
2. **État de chargement** : 
   - `!isLoadingGames` : Les parties doivent être chargées
   - `!isLoadingExercises` : Les exercices doivent être chargées
   - `!isAnalyzing` : Aucune analyse déjà en cours
   - `games.length > 0` : Au moins une partie disponible

3. **Condition métier** : 
   - **Nombre de parties avec exercices < 3** (`MIN_GAMES_WITH_EXERCISES`)
   - Si vous avez déjà 3 parties ou plus avec des exercices non complétés, aucune nouvelle analyse ne sera déclenchée

4. **Partie disponible** :
   - Il doit exister au moins une partie non analysée (`!analyzed_at`)
   - Cette partie doit avoir un PGN (`game.pgn`)

### Ordre d'analyse

Les parties sont triées par **date croissante** (plus anciennes en premier) :
- La première partie non analysée trouvée est la **plus ancienne**
- L'analyse progresse chronologiquement des plus anciennes vers les plus récentes

---

## 2. Flux Complet

```
┌─────────────────────────────────────────────────────────────┐
│              DÉMARRAGE / CHAQUE 5 SECONDES                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │   Vérifications préalables     │
        │   - isLoadingGames ?          │
        │   - isLoadingExercises ?     │
        │   - isAnalyzing ?             │
        │   - games.length > 0 ?       │
        └───────────────┬───────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │   Compter parties avec        │
        │   exercices non complétés     │
        └───────────────┬───────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │   countGamesWithExercises     │
        │   >= 3 ?                      │
        └───────────────┬───────────────┘
                        │
            ┌───────────┴───────────┐
            │                       │
          OUI                      NON
            │                       │
            │                       ▼
            │           ┌───────────────────────────┐
            │           │   Trier parties par date  │
            │           │   (croissante)            │
            │           └───────────┬───────────────┘
            │                       │
            │                       ▼
            │           ┌───────────────────────────┐
            │           │   Trouver partie non      │
            │           │   analysée (plus ancienne)│
            │           └───────────┬───────────────┘
            │                       │
            │                       ▼
            │           ┌───────────────────────────┐
            │           │   Appeler analyzeGames()  │
            │           │   avec la partie         │
            │           └───────────────────────────┘
            │
            ▼
    ┌───────────────┐
    │   NE RIEN     │
    │   FAIRE       │
    └───────────────┘
```

---

## 3. Processus d'Analyse

Une fois qu'une partie est sélectionnée pour analyse :

1. **Appel à `analyzeGames({ games: [nextUnanalyzedGame] })`**
   - Utilise `useAnalyzeGames` hook
   - Analyse le PGN avec depth 13 (par défaut)

2. **Progression** :
   - `progress` est mis à jour pour chaque coup analysé
   - `isAnalyzing` devient `true` (via `isPending` de React Query)

3. **Sauvegarde** :
   - Les analyses sont sauvegardées dans la DB/LocalStorage
   - `analyzed_at` est mis à jour sur la partie

4. **Génération d'exercices** :
   - Après l'analyse, les exercices sont générés automatiquement (blunders uniquement)
   - Cela se fait en différé (100ms après la sauvegarde)

5. **Invalidation des caches** :
   - React Query invalide les caches pour rafraîchir l'UI

---

## 4. Indicateur Visuel dans le Dashboard

L'indicateur d'analyse s'affiche quand :
- `isAnalyzing === true` (via `useAnalyzeGames`)
- OU `hasActiveProgress === true` (il y a une progression active dans `progress`)

L'indicateur affiche :
- Un spinner de chargement
- "Analyse en cours"
- Le numéro du coup en cours (ex: "Coup 15/50")
- Une barre de progression avec pourcentage

---

## 5. Exemple Concret

### Scénario 1 : Première connexion
1. 10 parties sont chargées (sync initiale)
2. Aucune partie n'a d'exercices → `countGamesWithExercises = 0`
3. `0 < 3` → Analyse automatique déclenchée
4. La partie la plus ancienne est analysée
5. Des exercices sont générés
6. `countGamesWithExercises = 1` (si la partie a des blunders)
7. `1 < 3` → Analyse de la partie suivante (plus ancienne)
8. Répète jusqu'à avoir 3 parties avec exercices

### Scénario 2 : Déjà 3 parties avec exercices
1. `countGamesWithExercises = 3`
2. `3 >= 3` → Aucune nouvelle analyse
3. L'utilisateur complète des exercices
4. `countGamesWithExercises = 2`
5. `2 < 3` → Analyse automatique déclenchée
6. La prochaine partie non analysée est analysée

### Scénario 3 : Toutes les parties sont analysées
1. Toutes les parties ont `analyzed_at !== null`
2. `nextUnanalyzedGame === undefined`
3. Aucune analyse déclenchée
4. L'indicateur ne s'affiche pas

---

## 6. Points Importants

### Pourquoi 3 parties minimum ?
- Garantit qu'il y a toujours des exercices disponibles
- Évite d'analyser trop de parties d'un coup
- Permet à l'utilisateur d'avoir du contenu varié

### Pourquoi analyser les plus anciennes en premier ?
- Assure une progression chronologique
- Les parties récentes sont souvent plus pertinentes pour l'apprentissage
- Mais on commence par les anciennes pour avoir un historique complet

### Pourquoi toutes les 5 secondes ?
- Évite de surcharger le système
- Permet une réactivité raisonnable
- Le `lastCheckRef` empêche les vérifications trop fréquentes

---

## 7. Dépannage

### L'indicateur ne s'affiche pas
- Vérifier que `isAnalyzing` est `true` dans `useAnalyzeGames`
- Vérifier que `progress` contient une entrée avec `completed: false`
- Vérifier que la condition `showAnalyzingIndicator` est vraie

### Les analyses ne se déclenchent pas
- Vérifier qu'il y a moins de 3 parties avec exercices
- Vérifier qu'il existe des parties non analysées avec PGN
- Vérifier que `isAnalyzing` n'est pas déjà `true`
- Vérifier que les parties et exercices sont chargés

### Les analyses se déclenchent trop souvent
- Normal si vous avez moins de 3 parties avec exercices
- Le système essaie de maintenir ce minimum
- Une fois 3 parties atteintes, ça s'arrête


