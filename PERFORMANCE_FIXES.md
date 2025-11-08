# Optimisations de Performance Appliquées

## Problème Identifié

D'après les logs :

- **Fetch Supabase: 1300-1500ms** 🔴 (PROBLÈME PRINCIPAL)
- Parsing PGN: 200-500ms ✅ (Acceptable)
- resetBoard: 50-120ms ✅ (Acceptable)

## Solutions Appliquées

### 1. **Optimisation des Requêtes Supabase**

✅ **Sélection de colonnes spécifiques** au lieu de `select("*")`

- Réduit la taille des données transférées
- Moins de parsing JSON

✅ **Cache React Query amélioré**

- `staleTime: 10 minutes` au lieu de 0
- `gcTime: 30 minutes` pour garder en cache plus longtemps

✅ **Requêtes en parallèle**

- Game et analyses sont déjà en parallèle (React Query le fait automatiquement)

### 2. **Préchargement des Données (Prefetch)**

✅ **Prefetch au touch** (`onPressIn`)

- Quand tu touches une GameCard, les données commencent à se charger
- Quand tu cliques vraiment (`onPress`), les données sont souvent déjà en cache
- **Réduction attendue: 500-1000ms**

### 3. **Optimisation du Parsing PGN**

✅ **Parsing synchrone** au lieu de batch

- Le parsing par batch avec setTimeout multiples était plus lent
- Parsing en une fois est plus rapide (200-500ms au lieu de 1000ms+)

✅ **Éviter les re-parsings**

- Vérification si le PGN est déjà parsé avant de re-parser

### 4. **Optimisation du Chessboard**

✅ **queueMicrotask** pour le premier render

- Permet au UI de se rendre avant le resetBoard
- Meilleure latence perçue

## Résultat Attendu

### Avant:

- Fetch: 1300-1500ms
- Parsing: 200-500ms
- ResetBoard: 50-120ms
- **Total: ~1700ms**

### Après (avec prefetch au touch):

- Fetch: 0-100ms (déjà en cache)
- Parsing: 200-500ms
- ResetBoard: 50-120ms
- **Total: ~350-720ms**

## Test

1. **Sans prefetch**: Clique directement sur une partie → devrait être ~1700ms
2. **Avec prefetch**: Touche une partie, attends 1 seconde, puis clique → devrait être ~350ms

## Prochaines Optimisations Possibles

Si le fetch Supabase reste lent (> 500ms):

1. Vérifier la connexion réseau
2. Utiliser un CDN pour Supabase
3. Stocker les parties récentes en cache local (AsyncStorage)
4. Lazy loading: charger le PGN seulement quand nécessaire
