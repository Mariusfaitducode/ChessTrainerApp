# Problème de sérialisation dans les worklets Reanimated

## Contexte

Lors de l'utilisation de `react-native-reanimated`, il est courant d'avoir besoin d'appeler des fonctions JavaScript depuis un worklet (code exécuté sur le thread UI). Pour cela, on utilise `runOnJS()` qui permet d'exécuter une fonction JS depuis un worklet.

## Le problème

### Symptômes

- **Crash sur mobile** lors de l'appel à `runOnJS()` avec le message :
  - `Trying to access property '_synchronizableRef' of an object which cannot be sent to the UI runtime`
  - `Trying to access property 'from' of an object which cannot be sent to the UI runtime`
  - Application qui crash complètement sans message d'erreur clair

### Cause racine

Le problème survient lorsque des **fonctions sont définies à l'intérieur d'un callback worklet** et sont ensuite passées à `runOnJS()`.

#### Exemple de code problématique

```typescript
const moveTo = useCallback((from: Square, to: Square) => {
  return new Promise<Move | undefined>((resolve) => {
    // ...
    translateY.value = withTiming(y, { duration: moveDuration }, (isFinished) => {
      // ❌ PROBLÈME : Fonction définie DANS le worklet
      const callWrappedOnMove = (from: Square, to: Square) => {
        onMove(from, to);
      };
      
      // ❌ CRASH : runOnJS ne peut pas sérialiser cette fonction
      runOnJS(callWrappedOnMove)(moveFrom, moveToSquare);
    });
  });
}, []);
```

### Pourquoi ça crash ?

1. **Worklets et sérialisation** :
   - Les worklets s'exécutent sur le **thread UI** (natif)
   - `runOnJS()` doit **sérialiser** la fonction pour l'envoyer du thread UI vers le thread JS
   - La sérialisation ne fonctionne que pour :
     - Valeurs primitives (string, number, boolean, null, undefined)
     - Fonctions définies dans le **scope JavaScript** (pas dans un worklet)

2. **Fonctions définies dans un worklet** :
   - Une fonction définie dans un callback worklet fait partie du **contexte du worklet**
   - Elle ne peut pas être sérialisée car elle contient des références au contexte du worklet
   - Reanimated ne peut pas la transférer du thread UI vers le thread JS

3. **Objets complexes** :
   - Les objets JavaScript complexes (comme les objets `Move` de chess.js) contiennent des références non sérialisables
   - Il faut extraire les valeurs primitives avant de les passer à `runOnJS()`

## La solution

### Principe

**Définir toutes les fonctions utilisées avec `runOnJS()` en dehors du worklet**, au niveau du composant React.

### Solution correcte

```typescript
// ✅ SOLUTION : Fonctions définies EN DEHORS du worklet
const callWrappedOnMove = React.useCallback(
  (from: Square, to: Square) => {
    onMoveRef.current(from, to);
  },
  []
);

const resolveMove = React.useCallback(
  (fromParam: Square, toParam: Square, resolveIdParam: number) => {
    const validatedMove = validateMoveRef.current(fromParam, toParam);
    const resolveCallback = resolveCallbacksRef.current.get(resolveIdParam);
    if (resolveCallback) {
      resolveCallback(validatedMove || undefined);
      resolveCallbacksRef.current.delete(resolveIdParam);
    }
  },
  []
);

const moveTo = useCallback((from: Square, to: Square) => {
  return new Promise<Move | undefined>((resolve) => {
    // ...
    translateY.value = withTiming(y, { duration: moveDuration }, (isFinished) => {
      // ✅ Maintenant on utilise les fonctions définies en dehors
      runOnJS(callWrappedOnMove)(moveFrom, moveToSquare); // ✅ Fonctionne !
      runOnJS(resolveMove)(moveFrom, moveToSquare, resolveId); // ✅ Fonctionne !
    });
  });
}, [callWrappedOnMove, resolveMove]);
```

### Pourquoi ça fonctionne ?

1. **Fonctions dans le scope JS** :
   - Les fonctions sont définies au niveau du composant React
   - Elles existent dans le **scope JavaScript** normal
   - Elles peuvent être sérialisées par Reanimated

2. **Stabilité avec useCallback** :
   - `useCallback` avec des dépendances vides garantit que la fonction est stable
   - La même référence est utilisée à chaque render
   - Pas de problème de closure ou de dépendances

3. **Closure sur les refs** :
   - Les fonctions peuvent accéder aux refs (comme `onMoveRef.current`)
   - Les refs sont des objets JavaScript normaux, accessibles depuis les deux threads
   - Pas besoin de les sérialiser, juste d'y accéder depuis le thread JS

## Bonnes pratiques

### ✅ À faire

1. **Définir les fonctions helper en dehors du worklet** :
   ```typescript
   const myHelper = useCallback((param: string) => {
     // Logique JS
   }, []);
   
   // Dans le worklet
   runOnJS(myHelper)(value);
   ```

2. **Utiliser des refs pour les callbacks** :
   ```typescript
   const callbackRef = useRef(callback);
   useEffect(() => {
     callbackRef.current = callback;
   }, [callback]);
   
   // Dans la fonction helper
   callbackRef.current(param);
   ```

3. **Extraire les valeurs primitives** :
   ```typescript
   // Dans le worklet, avant runOnJS
   const moveFrom = move.from; // string (primitif)
   const moveTo = move.to; // string (primitif)
   
   // Passer seulement les primitives
   runOnJS(myFunction)(moveFrom, moveTo);
   ```

4. **Utiliser des Maps/IDs pour les callbacks** :
   ```typescript
   const callbacksRef = useRef<Map<number, Function>>(new Map());
   const id = counterRef.current++;
   callbacksRef.current.set(id, callback);
   
   // Passer seulement l'ID (nombre)
   runOnJS(resolveCallback)(id, param);
   ```

### ❌ À éviter

1. **Définir des fonctions dans un worklet** :
   ```typescript
   // ❌ MAUVAIS
   translateY.value = withTiming(y, {}, (isFinished) => {
     const myFunction = () => { /* ... */ };
     runOnJS(myFunction)(); // Crash !
   });
   ```

2. **Passer des objets complexes directement** :
   ```typescript
   // ❌ MAUVAIS
   runOnJS(myFunction)(moveObject); // moveObject contient des références non sérialisables
   
   // ✅ BON
   runOnJS(myFunction)(moveObject.from, moveObject.to);
   ```

3. **Passer des callbacks directement** :
   ```typescript
   // ❌ MAUVAIS
   runOnJS(resolve)(value); // resolve est une fonction de callback Promise
   
   // ✅ BON
   const resolveId = counterRef.current++;
   resolveCallbacksRef.current.set(resolveId, resolve);
   runOnJS(resolveWithId)(resolveId, value);
   ```

## Règle générale

> **Ne jamais définir de fonctions à l'intérieur d'un worklet si elles doivent être passées à `runOnJS()`.**

Toutes les fonctions utilisées avec `runOnJS()` doivent être :
- Définies **en dehors** du worklet
- Stables (via `useCallback` si nécessaire)
- Capables d'accéder aux données nécessaires via des refs ou des valeurs primitives

## Références

- [Reanimated Documentation - Threading](https://docs.swmansion.com/react-native-reanimated/docs/threading/runOnJS/)
- [Reanimated Documentation - Worklets](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/worklets/)

