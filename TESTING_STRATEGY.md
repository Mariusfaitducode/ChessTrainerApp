# Stratégie de Tests pour la Génération d'Exercices

## 🎯 Pourquoi des Tests ?

### Problèmes Actuels
1. **37.5% des blunders** ont `best_move === played_move` (anormalement élevé)
2. **Comparaison de coups fragile** : LAN vs SAN non gérés correctement
3. **Logique de classification** : `classifyMistake` ne vérifie pas si le coup joué est le meilleur
4. **Pas de validation** : Erreurs découvertes seulement en production

### Bénéfices des Tests
- ✅ **Détection précoce** des bugs avant la production
- ✅ **Confiance** dans le code lors des refactorings
- ✅ **Documentation** vivante du comportement attendu
- ✅ **Réduction des régressions** lors de nouvelles fonctionnalités

## 📋 Tests à Créer

### 1. Tests Unitaires pour `move-comparison.ts`

**Fichier** : `services/chess/__tests__/move-comparison.test.ts`

```typescript
describe("compareMoves", () => {
  it("devrait détecter que deux coups SAN identiques sont égaux", () => {
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    expect(compareMoves("e4", "e4", fen)).toBe(true);
  });

  it("devrait détecter que LAN et SAN représentent le même coup", () => {
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    expect(compareMoves("e2e4", "e4", fen)).toBe(true);
  });

  it("devrait détecter que deux coups différents sont différents", () => {
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    expect(compareMoves("e4", "d4", fen)).toBe(false);
  });

  it("devrait gérer les annotations (+, #, =, etc.)", () => {
    const fen = "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4";
    expect(compareMoves("Bxf7+", "Bxf7", fen)).toBe(true);
  });

  it("devrait gérer les promotions", () => {
    const fen = "8/4P3/8/8/8/8/8/8 w - - 0 1";
    expect(compareMoves("e7e8q", "e8=Q", fen)).toBe(true);
  });
});
```

### 2. Tests Unitaires pour `classifyMistake`

**Fichier** : `services/chess/__tests__/analyzer.test.ts`

```typescript
describe("classifyMistake", () => {
  it("ne devrait pas classifier comme erreur si le coup joué est le meilleur", () => {
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const playedMove = "e4";
    const bestMove = "e4";
    
    // Même si l'évaluation change, si c'est le meilleur coup, pas d'erreur
    const mistake = classifyMistake(50, 30, true, playedMove, bestMove, fen);
    expect(mistake).toBe(null);
  });

  it("devrait classifier un blunder correctement", () => {
    const fen = "...";
    const playedMove = "e4";
    const bestMove = "Nf3"; // Meilleur coup différent
    
    const mistake = classifyMistake(50, -150, true, playedMove, bestMove, fen);
    expect(mistake).toBe("blunder");
  });

  it("ne devrait pas classifier si la perte est négative (coup améliorant)", () => {
    const mistake = classifyMistake(50, 100, true, "e4", "e4", "...");
    expect(mistake).toBe(null);
  });
});
```

### 3. Tests d'Intégration pour `createExerciseFromAnalysis`

**Fichier** : `services/chess/__tests__/exercise-generator.test.ts`

```typescript
describe("createExerciseFromAnalysis", () => {
  it("ne devrait pas créer d'exercice si best_move === played_move", () => {
    const analysis: GameAnalysis = {
      id: "test-id",
      game_id: "game-id",
      move_number: 1,
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      evaluation: 50,
      best_move: "e4",
      played_move: "e4", // Même coup !
      mistake_level: "blunder",
      analysis_data: null,
      created_at: new Date().toISOString(),
    };

    const context = {
      game: { ...mockGame },
      userUsernames: ["testuser"],
    };

    const exercise = createExerciseFromAnalysis(analysis, context);
    expect(exercise).toBe(null);
  });

  it("devrait créer un exercice si best_move !== played_move", () => {
    const analysis: GameAnalysis = {
      ...mockAnalysis,
      best_move: "e4",
      played_move: "d4", // Coups différents
      mistake_level: "blunder",
    };

    const exercise = createExerciseFromAnalysis(analysis, mockContext);
    expect(exercise).not.toBe(null);
    expect(exercise?.correct_move).toBe("e4");
  });
});
```

### 4. Tests E2E pour le Flux Complet

**Fichier** : `services/chess/__tests__/exercise-generation-e2e.test.ts`

```typescript
describe("Génération d'exercices E2E", () => {
  it("ne devrait pas créer d'exercices avec best_move === played_move", async () => {
    // Créer des analyses de test avec certains blunders où best_move === played_move
    const analyses: GameAnalysis[] = [
      {
        ...mockAnalysis,
        move_number: 1,
        best_move: "e4",
        played_move: "e4", // Même coup
        mistake_level: "blunder",
      },
      {
        ...mockAnalysis,
        move_number: 2,
        best_move: "Nf3",
        played_move: "e5", // Coups différents
        mistake_level: "blunder",
      },
    ];

    const count = await generateExercisesFromAnalyses(
      mockSupabase,
      analyses,
      mockGame,
      ["testuser"],
    );

    // Seul le deuxième devrait créer un exercice
    expect(count).toBe(1);
  });
});
```

## 🛠️ Outils Recommandés

### Framework de Tests
- **Jest** : Standard pour React/TypeScript
- **Vitest** : Alternative plus rapide (compatible Jest)

### Configuration

**`jest.config.js`** ou **`vitest.config.ts`** :
```typescript
export default {
  testEnvironment: "node",
  roots: ["<rootDir>/services"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
};
```

## 📊 Couverture Cible

- **`move-comparison.ts`** : 100% (logique critique)
- **`classifyMistake`** : 90%+ (tous les cas limites)
- **`createExerciseFromAnalysis`** : 80%+ (cas principaux)
- **`generateExercisesFromAnalyses`** : 70%+ (flux principal)

## 🚀 Plan d'Implémentation

1. **Phase 1** : Tests pour `move-comparison.ts` (priorité haute)
2. **Phase 2** : Tests pour `classifyMistake` (priorité haute)
3. **Phase 3** : Tests pour `createExerciseFromAnalysis` (priorité moyenne)
4. **Phase 4** : Tests E2E (priorité basse)

## ✅ Checklist de Validation

Avant de considérer les tests comme complets :

- [ ] Tous les tests passent
- [ ] Couverture > 80% pour les fonctions critiques
- [ ] Tests documentent le comportement attendu
- [ ] Tests sont rapides (< 1s pour tous les tests unitaires)
- [ ] Tests sont maintenables (pas de duplication excessive)

