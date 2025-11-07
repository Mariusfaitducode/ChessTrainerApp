# Proposition de Refactoring - Chessboard Architecture

## Analyse des Problèmes Actuels

### 1. **Responsabilités Mélangées**

- `ChessboardWrapper` gère trop de choses : navigation, interactions, orientation, highlights
- La logique métier est dispersée entre le wrapper et la bibliothèque de base
- Difficile de comprendre quel code s'exécute dans quel mode

### 2. **Gestion des Modes Superficielle**

- Les modes sont gérés par des props conditionnelles (`mode === "visualization"`)
- Pas de séparation claire entre les comportements
- Le mode "visualization" crash car `gestureEnabled` est mal géré

### 3. **Callbacks Ambiguës**

- `onMove` retourne `boolean | void` selon le contexte
- Comportement différent selon le mode (exercise vs game)
- Difficile de savoir quand un coup est accepté ou rejeté

### 4. **Navigation Complexe**

- La navigation est mélangée avec la gestion des interactions
- `navigateToPosition` est appelé dans un `useEffect` complexe
- Timing et synchronisation difficiles à gérer

## Architecture Proposée

### Structure Modulaire

```
components/chess/
├── core/
│   ├── ChessboardCore.tsx          # Composant de base sans logique métier
│   └── ChessboardLayout.tsx        # Gestion layout/orientation
├── modes/
│   ├── VisualizationMode.tsx       # Handler mode visualisation
│   ├── ExerciseMode.tsx            # Handler mode exercice
│   ├── GameMode.tsx                # Handler mode jeu
│   └── types.ts                     # Types partagés
├── controllers/
│   ├── NavigationController.tsx    # Contrôleur navigation (visualization)
│   ├── InteractionController.tsx   # Contrôleur interactions (exercise/game)
│   └── HighlightController.tsx     # Contrôleur highlights
└── Chessboard.tsx                   # Point d'entrée principal (orchestrateur)
```

### Principes de Conception

1. **Séparation des Responsabilités**
   - Core : Affichage pur, pas de logique métier
   - Modes : Handlers spécifiques par use case
   - Controllers : Logique réutilisable (navigation, interaction, highlights)

2. **Composition over Configuration**
   - Chaque mode compose les controllers nécessaires
   - Facile d'ajouter un nouveau mode en composant les briques existantes

3. **Interface Unifiée**
   - Tous les modes exposent la même interface de base
   - Props spécifiques par mode via des types discriminants

4. **State Management Clair**
   - Chaque mode gère son propre état
   - State partagé dans les controllers

## Détails de l'Architecture

### 1. ChessboardCore

**Responsabilité** : Affichage pur du plateau, sans logique métier

```typescript
interface ChessboardCoreProps {
  fen: string;
  boardSize: number;
  boardOrientation: "white" | "black";
  showCoordinates: boolean;
  // Pas de onMove, pas de mode, juste l'affichage
}
```

### 2. Mode Handlers

#### VisualizationMode

- Utilise `NavigationController` pour naviguer dans l'historique
- Désactive toutes les interactions (`gestureEnabled: false`)
- Gère les animations de navigation
- Affiche les highlights du dernier coup

#### ExerciseMode

- Utilise `InteractionController` pour gérer les coups
- Valide les coups via callback
- Affiche les feedbacks visuels
- Peut afficher des hints

#### GameMode

- Utilise `InteractionController` + `NavigationController`
- Permet de jouer ET de naviguer dans l'historique
- Gère les variantes (futur)

### 3. Controllers

#### NavigationController

```typescript
interface NavigationControllerProps {
  moveHistory: Move[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  chessboardRef: ChessboardRef;
}
```

- Gère `navigateToPosition`
- Optimise les animations (forward/backward)
- Gère les highlights du dernier coup

#### InteractionController

```typescript
interface InteractionControllerProps {
  onMove: (move: MoveInfo) => boolean | void;
  validateMove?: (move: MoveInfo) => boolean;
  chessboardRef: ChessboardRef;
}
```

- Gère `gestureEnabled`
- Valide les coups avant de les jouer
- Gère les callbacks `onMove`

#### HighlightController

```typescript
interface HighlightControllerProps {
  squares: string[];
  lastMove?: { from: string; to: string };
  chessboardRef: ChessboardRef;
}
```

- Gère tous les highlights
- Synchronise avec les re-renders
- Évite les clignotements

### 4. Point d'Entrée Principal

```typescript
interface ChessboardProps {
  // Props communes
  fen: string;
  boardOrientation?: "white" | "black";
  showCoordinates?: boolean;

  // Mode discriminant
  mode: "visualization" | "exercise" | "game";

  // Props spécifiques par mode
  visualization?: {
    moveHistory: Move[];
    currentMoveIndex: number;
    onNavigate?: (index: number) => void;
  };
  exercise?: {
    onMove: (move: MoveInfo) => boolean;
    highlightSquares?: string[];
  };
  game?: {
    onMove: (move: MoveInfo) => void;
    moveHistory?: Move[];
    currentMoveIndex?: number;
  };
}
```

## Avantages de cette Architecture

1. **Modularité** : Chaque brique a une responsabilité claire
2. **Extensibilité** : Ajouter un nouveau mode = créer un handler + composer les controllers
3. **Testabilité** : Chaque composant peut être testé indépendamment
4. **Maintenabilité** : Code organisé et facile à comprendre
5. **Performance** : Pas de logique inutile selon le mode

## Migration Progressive

1. **Phase 1** : Créer la structure de base (Core, Layout)
2. **Phase 2** : Extraire les controllers (Navigation, Interaction, Highlight)
3. **Phase 3** : Créer les mode handlers
4. **Phase 4** : Refactorer le point d'entrée principal
5. **Phase 5** : Migrer les usages existants

## Exemple d'Utilisation

```typescript
// Mode visualization
<Chessboard
  fen={currentFen}
  mode="visualization"
  visualization={{
    moveHistory,
    currentMoveIndex,
    onNavigate: goToMove,
  }}
/>

// Mode exercise
<Chessboard
  fen={exercise.fen}
  mode="exercise"
  exercise={{
    onMove: handleMove,
    highlightSquares: selectedSquares,
  }}
/>

// Mode game
<Chessboard
  fen={currentFen}
  mode="game"
  game={{
    onMove: handleMove,
    moveHistory,
    currentMoveIndex,
  }}
/>
```

## Plan d'Implémentation Détaillé

### Étape 1 : Créer la Structure de Base

#### 1.1 ChessboardCore

- Extraire la logique d'affichage pure de `ChessboardWrapper`
- Gérer uniquement : FEN, taille, orientation, coordonnées
- Pas de logique métier, pas de callbacks

#### 1.2 ChessboardLayout

- Gérer la rotation du plateau (boardOrientation)
- Gérer la rotation des pièces
- Gérer l'affichage des coordonnées

### Étape 2 : Créer les Controllers

#### 2.1 NavigationController

**Fichier** : `components/chess/controllers/NavigationController.tsx`

**Responsabilités** :

- Gérer `navigateToPosition` avec animations
- Optimiser forward/backward navigation
- Gérer les highlights du dernier coup
- Synchroniser avec le chess engine

**Interface** :

```typescript
interface NavigationControllerProps {
  chessboardRef: RefObject<ChessboardRef>;
  moveHistory: Move[];
  currentIndex: number;
  targetFen: string;
  onNavigationComplete?: () => void;
}
```

#### 2.2 InteractionController

**Fichier** : `components/chess/controllers/InteractionController.tsx`

**Responsabilités** :

- Gérer `gestureEnabled`
- Valider les coups avant de les jouer
- Gérer les callbacks `onMove`
- Gérer les promotions

**Interface** :

```typescript
interface InteractionControllerProps {
  chessboardRef: RefObject<ChessboardRef>;
  onMove: (move: MoveInfo) => boolean | void;
  validateMove?: (move: MoveInfo) => boolean;
  enabled: boolean;
}
```

#### 2.3 HighlightController

**Fichier** : `components/chess/controllers/HighlightController.tsx`

**Responsabilités** :

- Gérer tous les highlights (squares, lastMove)
- Synchroniser avec les re-renders
- Éviter les clignotements

**Interface** :

```typescript
interface HighlightControllerProps {
  chessboardRef: RefObject<ChessboardRef>;
  squares?: string[];
  lastMove?: { from: string; to: string };
  autoHighlightLastMove?: boolean;
}
```

### Étape 3 : Créer les Mode Handlers

#### 3.1 VisualizationMode

**Fichier** : `components/chess/modes/VisualizationMode.tsx`

**Composition** :

- `ChessboardCore` pour l'affichage
- `NavigationController` pour la navigation
- `HighlightController` pour les highlights

**Comportement** :

- `gestureEnabled: false` (pas d'interactions)
- Navigation via `navigateToPosition`
- Highlights automatiques du dernier coup

#### 3.2 ExerciseMode

**Fichier** : `components/chess/modes/ExerciseMode.tsx`

**Composition** :

- `ChessboardCore` pour l'affichage
- `InteractionController` pour les interactions
- `HighlightController` pour les feedbacks

**Comportement** :

- `gestureEnabled: true`
- Validation des coups via `onMove`
- Highlights personnalisés (squares sélectionnées)

#### 3.3 GameMode

**Fichier** : `components/chess/modes/GameMode.tsx`

**Composition** :

- `ChessboardCore` pour l'affichage
- `InteractionController` pour jouer
- `NavigationController` pour naviguer dans l'historique
- `HighlightController` pour les highlights

**Comportement** :

- `gestureEnabled: true` pour jouer
- Navigation possible dans l'historique
- Highlights automatiques + personnalisés

### Étape 4 : Refactorer le Point d'Entrée

#### 4.1 Nouveau Chessboard.tsx

**Fichier** : `components/chess/Chessboard.tsx`

**Structure** :

```typescript
export function Chessboard(props: ChessboardProps) {
  const mode = props.mode;

  switch (mode) {
    case "visualization":
      return <VisualizationMode {...props.visualization} {...commonProps} />;
    case "exercise":
      return <ExerciseMode {...props.exercise} {...commonProps} />;
    case "game":
      return <GameMode {...props.game} {...commonProps} />;
  }
}
```

### Étape 5 : Migration des Usages

#### 5.1 game/[id].tsx

```typescript
// Avant
<ChessboardWrapper
  fen={currentFen}
  mode="visualization"
  moveHistory={moveHistory}
  currentMoveIndex={currentMoveIndex}
/>

// Après
<Chessboard
  fen={currentFen}
  mode="visualization"
  visualization={{
    moveHistory,
    currentMoveIndex,
    onNavigate: goToMove,
  }}
/>
```

#### 5.2 exercise/[id].tsx

```typescript
// Avant
<ChessboardWrapper
  fen={exercise.fen}
  mode="exercise"
  onMove={handleMove}
  highlightSquares={selectedSquares}
/>

// Après
<Chessboard
  fen={exercise.fen}
  mode="exercise"
  exercise={{
    onMove: handleMove,
    highlightSquares: selectedSquares,
  }}
/>
```

## Avantages Spécifiques

### 1. Séparation Claire des Modes

- Chaque mode a son propre fichier
- Pas de logique conditionnelle complexe
- Facile de comprendre le comportement d'un mode

### 2. Réutilisabilité

- Les controllers peuvent être réutilisés dans différents modes
- Facile d'ajouter un nouveau mode en composant les controllers

### 3. Testabilité

- Chaque composant peut être testé indépendamment
- Mocks faciles pour les controllers

### 4. Performance

- Pas de logique inutile selon le mode
- Code splitting possible par mode

### 5. Maintenabilité

- Code organisé et facile à naviguer
- Responsabilités claires
- Facile d'ajouter des fonctionnalités

## Gestion des Erreurs

### Erreurs de Navigation

- Gérer les cas où `moveHistory` est vide
- Gérer les index invalides
- Fallback vers `resetBoard` si nécessaire

### Erreurs d'Interaction

- Valider les coups avant de les jouer
- Gérer les coups illégaux
- Feedback visuel pour les erreurs

### Erreurs de Highlight

- Vérifier que les refs existent
- Gérer les re-renders
- Éviter les clignotements

## Extensibilité Future

### Ajouter un Nouveau Mode

Exemple : Mode "Analysis" pour tester des variantes

1. Créer `AnalysisMode.tsx`
2. Composer les controllers nécessaires :
   - `InteractionController` pour tester des coups
   - `NavigationController` pour naviguer dans les variantes
   - `HighlightController` pour les highlights
3. Ajouter le type dans `ChessboardProps`
4. Ajouter le case dans le switch

**Code** :

```typescript
case "analysis":
  return <AnalysisMode {...props.analysis} {...commonProps} />;
```

C'est tout ! Pas besoin de modifier les autres modes.

## Checklist de Migration

- [ ] Créer la structure de dossiers
- [ ] Extraire `ChessboardCore`
- [ ] Créer `ChessboardLayout`
- [ ] Créer `NavigationController`
- [ ] Créer `InteractionController`
- [ ] Créer `HighlightController`
- [ ] Créer `VisualizationMode`
- [ ] Créer `ExerciseMode`
- [ ] Créer `GameMode`
- [ ] Refactorer `Chessboard.tsx`
- [ ] Migrer `game/[id].tsx`
- [ ] Migrer `exercise/[id].tsx`
- [ ] Tests de régression
- [ ] Documentation

## Diagramme d'Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Chessboard (Orchestrateur)                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │Visualiz. │  │Exercise  │  │  Game    │                   │
│  │  Mode    │  │  Mode    │  │  Mode    │                   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                   │
└───────┼──────────────┼──────────────┼─────────────────────────┘
        │              │              │
        │              │              │
┌───────▼──────────────▼──────────────▼───────────────────────┐
│                    Controllers                                │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐ │
│  │ Navigation     │  │ Interaction    │  │ Highlight    │ │
│  │ Controller     │  │ Controller     │  │ Controller   │ │
│  └────────┬───────┘  └────────┬───────┘  └──────┬───────┘ │
└───────────┼────────────────────┼──────────────────┼─────────┘
            │                    │                  │
            └────────────────────┼──────────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │   ChessboardCore        │
                    │   (Affichage pur)        │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │  react-native-chessboard│
                    │  (Bibliothèque de base)  │
                    └─────────────────────────┘
```

## Exemples de Code Concrets

### 1. ChessboardCore.tsx

```typescript
import React, { useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Chessboard from '@/lib/react-native-chessboard/src';
import type { ChessboardRef } from '@/lib/react-native-chessboard/src';

interface ChessboardCoreProps {
  fen: string;
  boardOrientation: "white" | "black";
  showCoordinates: boolean;
  onRefReady?: (ref: ChessboardRef | null) => void;
}

export function ChessboardCore({
  fen,
  boardOrientation,
  showCoordinates,
  onRefReady,
}: ChessboardCoreProps) {
  const chessboardRef = useRef<ChessboardRef>(null);
  const containerRef = useRef<View>(null);
  const [boardSize, setBoardSize] = useState(0);

  const handleLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && width !== boardSize) {
      setBoardSize(width);
      if (chessboardRef.current && onRefReady) {
        onRefReady(chessboardRef.current);
      }
    }
  };

  return (
    <View ref={containerRef} style={styles.container} onLayout={handleLayout}>
      {boardSize > 0 && (
        <Chessboard
          ref={chessboardRef}
          fen={fen}
          gestureEnabled={false} // Core ne gère jamais les interactions
          visualizationMode={true}
          withLetters={showCoordinates && boardOrientation === "white"}
          withNumbers={showCoordinates && boardOrientation === "white"}
          boardSize={boardSize}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    aspectRatio: 1,
  },
});
```

### 2. NavigationController.tsx

```typescript
import { useEffect, useRef } from "react";
import type { ChessboardRef } from "@/lib/react-native-chessboard/src";
import type { Move } from "chess.js";

interface NavigationControllerProps {
  chessboardRef: React.RefObject<ChessboardRef | null>;
  moveHistory: Move[];
  currentIndex: number;
  targetFen: string;
  enabled: boolean;
}

export function useNavigationController({
  chessboardRef,
  moveHistory,
  currentIndex,
  targetFen,
  enabled,
}: NavigationControllerProps) {
  const previousIndexRef = useRef<number>(currentIndex);
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    if (!enabled || !chessboardRef.current || isNavigatingRef.current) {
      return;
    }

    if (currentIndex === previousIndexRef.current) {
      return;
    }

    isNavigatingRef.current = true;
    const previousIndex = previousIndexRef.current;
    previousIndexRef.current = currentIndex;

    chessboardRef.current
      .navigateToPosition({
        targetFen,
        moveHistory: moveHistory.length > 0 ? moveHistory : undefined,
        currentIndex: previousIndex,
        targetIndex: currentIndex,
      })
      .finally(() => {
        isNavigatingRef.current = false;
      });
  }, [currentIndex, targetFen, moveHistory, enabled, chessboardRef]);
}
```

### 3. InteractionController.tsx

```typescript
import { useCallback } from "react";
import type { ChessboardRef } from "@/lib/react-native-chessboard/src";

interface MoveInfo {
  from: string;
  to: string;
  promotion?: string;
}

interface InteractionControllerProps {
  chessboardRef: React.RefObject<ChessboardRef | null>;
  onMove: (move: MoveInfo) => boolean | void;
  enabled: boolean;
}

export function useInteractionController({
  chessboardRef,
  onMove,
  enabled,
}: InteractionControllerProps) {
  const handleMove = useCallback(
    (info: { move: { from: string; to: string; promotion?: string } }) => {
      if (!enabled || !onMove) return;

      const result = onMove({
        from: info.move.from,
        to: info.move.to,
        promotion: info.move.promotion,
      });

      // Si onMove retourne false, le coup est rejeté
      // Sinon, le coup est accepté et sera joué par react-native-chessboard
      return result !== false;
    },
    [onMove, enabled],
  );

  return {
    gestureEnabled: enabled && !!onMove,
    onMove: handleMove,
  };
}
```

### 4. VisualizationMode.tsx

```typescript
import React, { useRef } from 'react';
import { ChessboardCore } from '../core/ChessboardCore';
import { useNavigationController } from '../controllers/NavigationController';
import { useHighlightController } from '../controllers/HighlightController';
import type { Move } from 'chess.js';

interface VisualizationModeProps {
  fen: string;
  moveHistory: Move[];
  currentMoveIndex: number;
  boardOrientation: "white" | "black";
  showCoordinates?: boolean;
}

export function VisualizationMode({
  fen,
  moveHistory,
  currentMoveIndex,
  boardOrientation,
  showCoordinates = true,
}: VisualizationModeProps) {
  const chessboardRef = useRef<ChessboardRef | null>(null);

  // Navigation controller
  useNavigationController({
    chessboardRef,
    moveHistory,
    currentIndex: currentMoveIndex,
    targetFen: fen,
    enabled: true,
  });

  // Highlight controller (highlight automatique du dernier coup)
  useHighlightController({
    chessboardRef,
    lastMove:
      currentMoveIndex >= 0 && moveHistory[currentMoveIndex]
        ? {
            from: moveHistory[currentMoveIndex].from,
            to: moveHistory[currentMoveIndex].to,
          }
        : undefined,
    autoHighlightLastMove: true,
  });

  return (
    <ChessboardCore
      fen={fen}
      boardOrientation={boardOrientation}
      showCoordinates={showCoordinates}
      onRefReady={(ref) => {
        chessboardRef.current = ref;
      }}
    />
  );
}
```

### 5. ExerciseMode.tsx

```typescript
import React, { useRef } from 'react';
import { ChessboardCore } from '../core/ChessboardCore';
import { useInteractionController } from '../controllers/InteractionController';
import { useHighlightController } from '../controllers/HighlightController';

interface ExerciseModeProps {
  fen: string;
  onMove: (move: { from: string; to: string; promotion?: string }) => boolean;
  highlightSquares?: string[];
  boardOrientation: "white" | "black";
  showCoordinates?: boolean;
}

export function ExerciseMode({
  fen,
  onMove,
  highlightSquares = [],
  boardOrientation,
  showCoordinates = true,
}: ExerciseModeProps) {
  const chessboardRef = useRef<ChessboardRef | null>(null);

  // Interaction controller
  const { gestureEnabled, onMove: handleMove } = useInteractionController({
    chessboardRef,
    onMove,
    enabled: true,
  });

  // Highlight controller (highlights personnalisés)
  useHighlightController({
    chessboardRef,
    squares: highlightSquares,
    autoHighlightLastMove: false,
  });

  return (
    <ChessboardCore
      fen={fen}
      boardOrientation={boardOrientation}
      showCoordinates={showCoordinates}
      onRefReady={(ref) => {
        chessboardRef.current = ref;
        // Activer les gestes après que le ref soit prêt
        if (ref && gestureEnabled) {
          // Le ChessboardCore doit être modifié pour accepter gestureEnabled
        }
      }}
    />
  );
}
```

## Points d'Attention

### 1. Gestion du Ref

- Le `ChessboardCore` doit exposer le ref pour que les controllers puissent l'utiliser
- Utiliser `forwardRef` ou un callback `onRefReady`

### 2. Synchronisation des Controllers

- Les controllers doivent être indépendants
- Utiliser des `useEffect` avec les bonnes dépendances
- Éviter les race conditions

### 3. Performance

- Mémoriser les callbacks avec `useCallback`
- Éviter les re-renders inutiles avec `React.memo`
- Optimiser les `useEffect` avec les bonnes dépendances

### 4. Gestion des Erreurs

- Try/catch dans les controllers
- Fallbacks pour les cas d'erreur
- Logs pour le debugging

## Prochaines Étapes

1. **Valider la proposition** avec l'équipe
2. **Créer une branche** pour le refactoring
3. **Implémenter étape par étape** selon le plan
4. **Tester chaque étape** avant de passer à la suivante
5. **Documenter** au fur et à mesure
