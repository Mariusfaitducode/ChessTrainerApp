# Analyse du crash mobile dans le mode exercice

## Problèmes identifiés

### 1. **`.enabled()` accède à `pieceEnabled.value` directement (LIGNE 231)**

```typescript
const gesture = Gesture.Pan().enabled(!isPromoting && pieceEnabled.value); // ❌ PROBLÈME ICI
```

**Pourquoi ça crash sur mobile :**

- `.enabled()` est évalué lors de la **création** du gesture, pas dans un worklet
- Sur mobile, accéder à `.value` en dehors d'un worklet peut causer un crash
- `pieceEnabled.value` est un `SharedValue` qui ne peut être lu que dans un worklet ou via `runOnUI`

**Solution :**

- Utiliser un `useDerivedValue` pour calculer si le gesture est enabled
- Ou utiliser une valeur JS normale au lieu d'un SharedValue pour `pieceEnabled`

### 2. **`onStartTap` est appelé directement depuis JS (LIGNE 225)**

```typescript
const handleOnBeginJS = useCallback(({...}) => {
  // ...
  runOnUI(updateScale)();
  onStartTap(square);  // ❌ PROBLÈME : onStartTap est un worklet
}, [...]);
```

**Pourquoi ça peut crash :**

- `onStartTap` est marqué comme `'worklet'` (ligne 154)
- On ne peut pas appeler un worklet directement depuis JS
- Il faut utiliser `runOnUI(onStartTap)(square)` ou `runOnJS` si c'est une fonction JS

**Solution :**

- Si `onStartTap` doit être un worklet, utiliser `runOnUI(onStartTap)(square)`
- Sinon, retirer `'worklet'` de `onStartTap` et l'appeler directement

### 3. **`handleOnBeginJS` manque dans les dépendances de `handleOnBeginWorklet` (LIGNE 192)**

```typescript
const handleOnBeginWorklet = useCallback(() => {
  'worklet';
  // ...
  runOnJS(handleOnBeginJS)({...});  // ❌ handleOnBeginJS pas dans les dépendances
}, [gestureEnabled, selectedSquare, translateX, translateY, toPosition]);
// handleOnBeginJS manque ici
```

**Pourquoi ça peut crash :**

- Si `handleOnBeginJS` change, `handleOnBeginWorklet` utilise une version stale
- Sur mobile, cela peut causer des crashes ou des comportements imprévisibles

**Solution :**

- Ajouter `handleOnBeginJS` dans les dépendances

### 4. **`isPromoting` est une valeur JS utilisée dans `.enabled()` (LIGNE 231)**

```typescript
.enabled(!isPromoting && pieceEnabled.value)
```

**Pourquoi ça peut crash :**

- `isPromoting` vient du contexte React (valeur JS)
- Mélangé avec `pieceEnabled.value` (SharedValue)
- Sur mobile, cette évaluation peut être problématique

**Solution :**

- Convertir `isPromoting` en SharedValue si nécessaire
- Ou utiliser un `useDerivedValue` pour calculer l'état enabled

## Problème le plus probable

**Le crash est probablement causé par la ligne 231 : `.enabled(!isPromoting && pieceEnabled.value)`**

Sur mobile, Reanimated est plus strict et accéder à `.value` dans `.enabled()` lors de la création du gesture peut causer un crash immédiat.

## Solutions à implémenter

1. **Créer un `useDerivedValue` pour `gestureEnabled` qui inclut `isPromoting` et `pieceEnabled`**
2. **Utiliser ce derived value dans `.enabled()` au lieu d'accéder directement à `.value`**
3. **Corriger l'appel à `onStartTap` pour utiliser `runOnUI` si c'est un worklet**
4. **Ajouter `handleOnBeginJS` dans les dépendances de `handleOnBeginWorklet`**
