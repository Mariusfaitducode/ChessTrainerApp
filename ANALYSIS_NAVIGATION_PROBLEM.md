# Analyse du Problème de Navigation

## Problème Observé
Lorsqu'on appuie rapidement plusieurs fois sur "next", l'animation est jouée plusieurs fois et apparaît de manière buggée.

## Flux Actuel

### 1. Clic sur "next"
```
goToNext() → setCurrentMoveIndex(prev => prev + 1)
```

### 2. NavigationController détecte le changement
```typescript
useEffect(() => {
  // Dépendances: [currentIndex, targetFen, moveHistory, enabled, chessboardRef]
  // Se déclenche à chaque changement de currentIndex
  
  // Debounce de 16ms
  setTimeout(async () => {
    await chessboardRef.current.navigateToPosition({...});
  }, 16);
}, [currentIndex, ...]);
```

### 3. navigateToPosition dans board-refs-context
```typescript
navigateToPosition: async ({ targetFen, moveHistory, currentIndex, targetIndex }) => {
  // 1. Vérifier si navigation en cours (verrou)
  // 2. Reset chess engine
  chess.reset();
  // 3. Rejouer TOUS les coups jusqu'à currentIndex
  for (let i = 0; i <= currentIndex; i++) {
    chess.move(moveHistory[i]);
  }
  // 4. Mettre à jour le board
  setBoard(chess.board());
  // 5. Attendre 50ms
  await new Promise(resolve => setTimeout(resolve, 50));
  // 6. Reset highlights
  // 7. Attendre 10ms
  // 8. Jouer les nouveaux coups avec animations
  for (let i = currentIndex + 1; i <= targetIndex; i++) {
    await pieceRefs.current[move.from].current.moveTo(move.to);
    chess.move(move);
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  // 9. Mettre à jour le board final
  // 10. Attendre 100ms
  // 11. Appliquer highlights
}
```

## Problèmes Identifiés

### Problème 1: Multiple useEffect déclenchés
- Si l'utilisateur clique 3 fois rapidement :
  - Clic 1: `currentIndex` passe de 0 à 1 → `useEffect` se déclenche
  - Clic 2: `currentIndex` passe de 1 à 2 → `useEffect` se déclenche (AVANT que le premier timeout ne se déclenche)
  - Clic 3: `currentIndex` passe de 2 à 3 → `useEffect` se déclenche
  
- Chaque `useEffect` programme un `setTimeout` de 16ms
- Même si on annule le timeout précédent, si plusieurs clics arrivent avant que le premier timeout ne se déclenche, plusieurs navigations peuvent être en attente

### Problème 2: navigateToPosition trop complexe
- `navigateToPosition` fait trop de choses :
  1. Reset le chess engine
  2. Rejoue tous les coups jusqu'à `currentIndex`
  3. Met à jour le board
  4. Attend 50ms
  5. Reset highlights
  6. Attend 10ms
  7. Joue les nouveaux coups avec animations
  8. Met à jour le board final
  9. Attend 100ms
  10. Applique highlights

- Cette complexité crée des opportunités pour des race conditions
- Si plusieurs navigations sont en attente, elles peuvent toutes essayer de faire ça en parallèle

### Problème 3: Verrou insuffisant
- Le verrou dans `navigateToPosition` attend la fin de la navigation précédente
- Mais pendant ce temps, plusieurs navigations peuvent être en attente
- Quand la première navigation se termine, toutes les navigations en attente peuvent se déclencher en cascade

### Problème 4: Code spécifique à la navigation dans react-native-chessboard
- `navigateToPosition` est une méthode spécifique à la navigation
- Elle ne devrait pas être dans react-native-chessboard
- react-native-chessboard devrait juste exposer `move()` pour déplacer les pièces
- La logique de navigation devrait être dans nos controllers

## Solution Proposée

### Principe
- **Supprimer `navigateToPosition` de react-native-chessboard**
- **Utiliser uniquement `move()` pour déplacer les pièces**
- **Déplacer toute la logique de navigation dans `NavigationController`**

### Architecture Simplifiée

#### react-native-chessboard
- Expose uniquement `move({ from, to, promotion })` → retourne `Promise<Move | undefined>`
- Expose `resetBoard(fen)` pour réinitialiser le board
- Expose `highlight({ square, color })` pour les highlights
- **Pas de logique de navigation**

#### NavigationController
- Gère toute la logique de navigation
- Utilise `move()` pour jouer les coups un par un
- Gère les animations en séquence
- Gère les highlights
- Gère le verrou pour éviter les navigations multiples

### Avantages
1. **Séparation des responsabilités** : react-native-chessboard gère l'affichage, NavigationController gère la navigation
2. **Plus simple** : Pas de code complexe dans react-native-chessboard
3. **Plus flexible** : On peut facilement changer la logique de navigation sans toucher à react-native-chessboard
4. **Plus testable** : Chaque partie peut être testée indépendamment
5. **Pas de race conditions** : Le verrou est dans NavigationController, pas dans react-native-chessboard

## Implémentation

### Étape 1: Simplifier react-native-chessboard
- Supprimer `navigateToPosition` de `ChessboardRef`
- Garder uniquement `move()`, `resetBoard()`, `highlight()`, etc.

### Étape 2: Refactorer NavigationController
- Utiliser `move()` pour jouer les coups un par un
- Gérer les animations en séquence
- Gérer le verrou pour éviter les navigations multiples
- Gérer les highlights

### Étape 3: Nettoyer le code
- Supprimer tout le code inutile
- Simplifier les délais et les attentes
- Optimiser les performances

