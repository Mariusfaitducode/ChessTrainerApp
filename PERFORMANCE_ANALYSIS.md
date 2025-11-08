# Analyse de Performance - Navigation vers une Partie

## Timeline des événements (quand tu cliques sur une partie)

### 1. **Clic sur GameCard** (`components/games/GameCard.tsx`)

- `onPress()` appelé
- `router.push('/(protected)/game/${gameId}')` déclenché
- **Temps estimé**: < 1ms (synchron)

### 2. **Navigation Expo Router**

- Expo Router résout la route
- Charge le fichier `app/(protected)/game/[id].tsx`
- **Temps estimé**: 5-20ms (première fois), < 5ms (cache)

### 3. **Premier Render de GameDetailScreen**

- Component monte
- `useLocalSearchParams()` extrait l'ID
- `useGame(id)` démarre une query React Query
- `useChessGame(null)` s'exécute (PGN pas encore disponible)
- Render initial avec `isLoading: true`
- **Temps estimé**: 10-30ms

### 4. **Fetch depuis Supabase** (`hooks/useGame.ts`)

```typescript
// Query 1: Récupérer la partie
const { data, error } = await supabase
  .from("games")
  .select("*")
  .eq("id", gameId)
  .single();

// Query 2: Récupérer les analyses
const { data: error } = await supabase
  .from("game_analyses")
  .select("*")
  .eq("game_id", gameId)
  .order("move_number", { ascending: true });
```

- **Temps estimé**: 100-500ms (dépend du réseau et de la taille des données)
- **Goulot d'étranglement potentiel**: Requêtes réseau synchrones

### 5. **Re-render après réception des données**

- `game` devient disponible
- `useChessGame(game.pgn)` est appelé avec le PGN
- **Temps estimé**: < 5ms

### 6. **Parsing du PGN** (`hooks/useChessGame.ts`)

```typescript
// Actuellement dans un setTimeout(0)
const game = new Chess();
game.loadPgn(pgn); // LOURD pour des parties longues

const history = game.history({ verbose: true }); // LOURD

// Boucle pour chaque coup (peut être 50-100+ coups)
for (const move of history) {
  tempGame.move(move); // LOURD
  const currentFen = tempGame.fen(); // LOURD
  // ... traitement
}
```

- **Temps estimé**: 50-200ms pour une partie de 40 coups
- **Goulot d'étranglement MAJEUR**: Parsing synchrone dans setTimeout
- **Problème**: Même avec setTimeout, ça bloque le thread JS

### 7. **Render avec données parsées**

- `moves`, `currentFen` disponibles
- `ChessboardWrapper` se render avec le FEN initial
- **Temps estimé**: 20-50ms

### 8. **Chessboard.resetBoard()** (`components/chess/Chessboard.tsx`)

```typescript
// Dans useEffect avec InteractionManager
InteractionManager.runAfterInteractions(() => {
  chessboardRef.current.resetBoard(fen);
});
```

- **Temps estimé**: 100-300ms (réinitialise tout le board, recalcule positions)
- **Goulot d'étranglement MAJEUR**: `resetBoard` est très lent dans react-native-chessboard
- **Problème**: InteractionManager peut attendre longtemps avant d'exécuter

### 9. **Calcul de flattenedMoves** (`app/(protected)/game/[id].tsx`)

```typescript
const flattenedMoves = useMemo(() => {
  return moves.flatMap((m) => { ... });
}, [moves]);
```

- **Temps estimé**: 5-20ms (dépend du nombre de coups)
- Relativement rapide mais peut être optimisé

### 10. **Render complet**

- Tous les composants rendus
- MoveList avec tous les coups
- **Temps estimé**: 30-100ms

## Temps Total Estimé

- **Minimum**: ~350ms
- **Typique**: ~800-1200ms
- **Maximum (parties longues)**: ~2000ms+

## Goulots d'étranglement identifiés

### 🔴 Critique

1. **Parsing PGN synchrone** (50-200ms)
   - Même dans setTimeout, bloque le thread JS
   - Solution: Web Worker ou parsing progressif

2. **Chessboard.resetBoard()** (100-300ms)
   - Opération très lourde dans react-native-chessboard
   - Solution: Utiliser `move()` au lieu de `resetBoard()`, ou lazy loading

### 🟡 Modéré

3. **Requêtes Supabase synchrones** (100-500ms)
   - Solution: Charger en parallèle, cache

4. **InteractionManager delay** (variable)
   - Peut ajouter 100-300ms de latence perçue
   - Solution: Appel direct pour premier render, InteractionManager pour updates

### 🟢 Mineur

5. **Calcul flattenedMoves** (5-20ms)
6. **Render initial** (30-100ms)
