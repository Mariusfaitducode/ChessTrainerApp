# Diagnostic : Problèmes avec react-native-chessboard

## Problèmes identifiés

### 1. Warning Reanimated lors des captures

**Symptôme** : `[Reanimated] Reading from value during component render` apparaît quand une pièce en mange une autre.

**Cause racine** :

- Quand on appelle `resetBoard(fen)`, le code fait :
  ```typescript
  resetBoard: (fen) => {
    chess.reset();
    if (fen) chess.load(fen);
    setBoard(chess.board()); // ⚠️ Déclenche un re-render immédiat
  };
  ```
- `setBoard` déclenche un re-render qui re-map toutes les pièces dans `Pieces.tsx`
- Pendant ce re-render, les nouveaux composants `Piece` sont créés et accèdent à des shared values dans leurs hooks :
  - `selectedSquare.value` (ligne 170 de piece/index.tsx)
  - `turn.value` (ligne 49 de piece/index.tsx)
  - `translateX.value`, `translateY.value` (lignes 166-167, 190-191)
- Ces accès pendant le render causent le warning Reanimated

**Pourquoi ça arrive surtout avec les captures** :

- Les captures impliquent une animation `withTiming` qui est en cours
- Quand on appelle `resetBoard` pendant l'animation, le board change mais les animations sont encore actives
- Les nouvelles pièces créées pendant le render essaient d'accéder aux shared values pendant le render

### 2. Transitions non fluides

**Symptôme** : Les transitions entre positions ne sont pas propres.

**Cause racine** :

- On utilise `resetBoard` pour naviguer entre les coups d'une partie déjà jouée
- `resetBoard` est conçu pour **réinitialiser complètement** le plateau, pas pour naviguer
- Résultat :
  - Toutes les pièces sont détruites et recréées
  - Les animations en cours sont interrompues brutalement
  - Pas de transition fluide entre les positions

**Comment ça devrait fonctionner** :

- Pour naviguer entre les coups, il faudrait utiliser `move()` au lieu de `resetBoard()`
- `move()` déclenche les animations de pièces correctement
- Mais on ne peut pas utiliser `move()` car on a déjà le FEN de la position cible, pas la séquence de coups

### 3. Utilisation incorrecte de react-native-chessboard

**Problème** :

- `react-native-chessboard` est conçu pour des parties **interactives** (joueur vs joueur)
- On l'utilise pour **visualiser** des parties déjà jouées (navigation)
- Ces deux cas d'usage sont différents :
  - **Interactive** : on joue des coups, le chess engine gère l'état
  - **Visualisation** : on a déjà tous les coups, on veut juste naviguer

**Problèmes spécifiques** :

1. On passe un `fen` statique au composant mais on change le FEN via `resetBoard`
2. On utilise `initialFen` qui ne change jamais, mais on force les mises à jour via `resetBoard`
3. Le composant maintient son propre état de chess engine, qu'on réinitialise constamment

## Solutions possibles

### Option 1 : Modifier react-native-chessboard (extraction du code)

**Avantages** :

- Contrôle total sur le comportement
- Peut optimiser `resetBoard` pour ne pas déclencher de re-render immédiat
- Peut ajouter une méthode `navigateToPosition(fen)` qui gère les transitions

**Inconvénients** :

- Plus de maintenance (doit gérer les updates de la lib)
- Plus de code à maintenir

**Modifications nécessaires** :

1. Dans `board-refs-context/index.tsx`, modifier `resetBoard` pour :
   - Ne pas appeler `setBoard` immédiatement
   - Utiliser `runOnUI` ou `requestAnimationFrame` pour différer la mise à jour
   - Attendre que les animations en cours soient terminées
2. Ajouter une méthode `navigateToPosition(fen)` qui :
   - Calcule les différences entre la position actuelle et la cible
   - Utilise `move()` pour les transitions quand possible
   - Utilise `resetBoard` seulement quand nécessaire

### Option 2 : Utiliser une autre bibliothèque

**Alternatives** :

- `dawikk-chessboard` : semble mieux adapté, plus moderne
- Créer un composant custom : contrôle total mais beaucoup de travail

**Inconvénients** :

- Perte de temps pour migrer
- Risque de nouveaux bugs

### Option 3 : Workaround dans notre code

**Solutions** :

1. **Ne pas appeler `resetBoard` pendant les animations** :
   - Détecter si une animation est en cours
   - Attendre qu'elle se termine avant de réinitialiser
   - Problème : comment détecter ?

2. **Utiliser `move()` au lieu de `resetBoard()`** :
   - Calculer les coups nécessaires pour aller de la position actuelle à la cible
   - Utiliser `move()` pour chaque coup
   - Problème : complexe, peut être lent

3. **Désactiver les animations pendant la navigation** :
   - Passer `durations={{ move: 0 }}` au composant
   - Réactiver après
   - Problème : pas de transitions du tout

## Recommandation

**Option 1 (extraction du code)** semble la meilleure car :

1. On a déjà identifié exactement où sont les problèmes
2. Les modifications sont ciblées et limitées
3. On garde le contrôle sans réécrire tout le composant
4. On peut optimiser pour notre cas d'usage spécifique

**Modifications prioritaires** :

1. Modifier `resetBoard` pour différer `setBoard` avec `runOnUI` ou `requestAnimationFrame`
2. Ajouter une logique pour annuler/attendre les animations en cours
3. Peut-être ajouter une méthode `navigateToPosition` optimisée

## Code à modifier

### 1. board-refs-context/index.tsx (ligne 101-105)

**Actuel** :

```typescript
resetBoard: (fen) => {
  chess.reset();
  if (fen) chess.load(fen);
  setBoard(chess.board()); // ⚠️ Re-render immédiat
};
```

**Proposé** :

```typescript
resetBoard: (fen) => {
  chess.reset();
  if (fen) chess.load(fen);
  // Différer le setBoard pour éviter les warnings Reanimated
  requestAnimationFrame(() => {
    runOnUI(() => {
      setBoard(chess.board());
    })();
  });
};
```

### 2. Gestion des animations en cours

Il faudrait ajouter un mécanisme pour :

- Suivre les animations en cours
- Attendre qu'elles se terminent avant de réinitialiser
- Ou les annuler proprement

## Prochaines étapes

1. Extraire `react-native-chessboard` dans le projet
2. Appliquer les modifications proposées
3. Tester avec des captures et des transitions rapides
4. Ajuster selon les résultats
