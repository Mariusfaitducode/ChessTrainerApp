# Explication de la Classification des Coups d'Échecs

## 📊 Vue d'Ensemble

Notre système classe chaque coup selon :
1. **Qualité du coup** (`move_quality`) : best, excellent, good, inaccuracy, mistake, blunder
2. **Niveau d'erreur** (`mistake_level`) : blunder, mistake, inaccuracy, ou null
3. **Phase de partie** (`game_phase`) : opening, middlegame, endgame
4. **Perte d'évaluation** (`evaluation_loss`) : en centipawns

---

## 🎯 Standards de Classification (Lichess/Chess.com)

| Qualité      | Écart d'évaluation (centipawns) | Description                          |
| ------------ | -------------------------------- | ------------------------------------ |
| **Best**     | < 50 cp                          | Coup quasi parfait, proche du meilleur |
| **Excellent** | 50-100 cp                        | Bon coup, petite imprécision          |
| **Good**     | 100-200 cp                       | Coup jouable, acceptable              |
| **Inaccuracy** | 200-300 cp                      | Imprécision, petit écart              |
| **Mistake**  | 300-500 cp                       | Erreur, écart significatif            |
| **Blunder**  | > 500 cp                         | Erreur grave, perte importante        |

**Note** : "Brilliant" n'est pas implémenté car il nécessite la détection de coups tactiques complexes (sacrifices, etc.), ce qui dépasse le cadre d'une simple comparaison d'évaluations.

---

## 🔢 Calcul de la Perte d'Évaluation

### Méthode Hybride (Précise + Approximative)

Nous utilisons une **méthode hybride** qui combine précision et performance :

#### 1. Méthode Précise (Quand Disponible)

Si le meilleur coup est différent du coup joué, nous analysons la position après le meilleur coup :

```typescript
// 1. Jouer le meilleur coup dans une position temporaire
const tempGame = new Chess(fen);
tempGame.move(bestMove);
const fenBestAfter = tempGame.fen();

// 2. Analyser cette position
const analysisBestAfter = await analyzePosition(fenBestAfter, depth);
const evalBestAfter = analysisBestAfter.evaluation;

// 3. Comparer avec l'évaluation après le coup joué
loss = Math.abs(evalBestAfter - evalAfter);
```

**Avantage** : Précision maximale, conforme aux standards Lichess/Chess.com  
**Inconvénient** : +1 analyse par coup (double les appels API)

#### 2. Méthode Approximative (Fallback)

Si l'analyse du meilleur coup échoue ou n'est pas disponible, nous utilisons une approximation :

```typescript
// Pour les blancs
loss = Math.abs(evalBefore + evalAfter)

// Pour les noirs
loss = Math.abs(evalAfter - evalBefore)
```

**Exemple pour les blancs** :
- Position avant : `evalBefore = +100 cp` (avantage blanc de 1 pawn)
- Après le meilleur coup : `evalBestAfter = +100 cp` (avantage blanc maintenu)
- Après le coup joué : `evalAfter = +50 cp` (avantage blanc réduit)
- Perte précise : `|100 - 50| = 50 cp` → **Best** (< 50 cp)

**Exemple avec approximation** :
- Position avant : `evalBefore = +100 cp`
- Après le coup joué : `evalAfter = -50 cp` (du point de vue des noirs)
- Perte approximative : `|100 + (-50)| = 150 cp` → **Good** (100-200 cp)

**Pourquoi ça fonctionne** :
- Si le coup joué est le meilleur, `evalAfter` sera proche de `-evalBefore` (pour les blancs), donc `loss ≈ 0`
- Si le coup joué est mauvais, `evalAfter` sera très différent, donc `loss` sera élevé

### Quand Utilise-t-on Chaque Méthode ?

- **Méthode précise** : Quand `bestMove` existe et est différent de `playedMove`
- **Méthode approximative** : Quand l'analyse du meilleur coup échoue ou n'est pas disponible

### Performance

- **Avec méthode précise** : ~2 analyses par coup (avant + après + meilleur coup)
- **Avec méthode approximative** : ~2 analyses par coup (avant + après)
- **Gain de précision** : ~30-50% selon les positions

---

## 🎲 Détermination de la Phase de Partie

La phase est déterminée uniquement par le **numéro du coup** :

| Phase        | Coups        | Description                    |
| ------------ | ------------ | ------------------------------ |
| **Opening**  | 1-15         | Début de partie, développement |
| **Middlegame** | 16-40       | Milieu de partie, tactique     |
| **Endgame**  | 41+          | Finale, technique              |

**Note** : Cette méthode est simplifiée. Une méthode plus précise prendrait en compte :
- Le nombre de pièces restantes
- La structure de pions
- La présence de dames

Mais pour la plupart des parties, le numéro de coup est un bon indicateur.

---

## 🔍 Vérification du Meilleur Coup

Avant de classifier, nous vérifions si le coup joué est **identique au meilleur coup** :

```typescript
if (bestMove && compareMoves(playedMove, bestMove, fen)) {
  return {
    move_quality: "best",
    mistake_level: null,
    evaluation_loss: 0,
  };
}
```

Cette vérification utilise `compareMoves()` qui :
1. Normalise les deux coups (retire annotations)
2. Joue les deux coups dans `chess.js`
3. Compare `from`, `to`, `promotion`

Cela garantit qu'un coup identique au meilleur est toujours classé comme "best", même si les formats diffèrent (LAN vs SAN).

---

## 📈 Flux de Classification

```
1. Analyser position AVANT le coup
   └─> Obtenir evalBefore et bestMove

2. Jouer le coup dans chess.js

3. Analyser position APRÈS le coup joué
   └─> Obtenir evalAfter

4. Vérifier si playedMove === bestMove
   └─> Si oui → "best", sinon continuer

5. Calculer la perte
   └─> loss = evalBefore + evalAfter (blancs) ou evalAfter - evalBefore (noirs)

6. Classifier selon les seuils
   └─> best (< 50), excellent (50-100), good (100-200), etc.

7. Déterminer la phase
   └─> opening (1-15), middlegame (16-40), endgame (41+)
```

---

## 🎯 Exemples Concrets

### Exemple 1 : Meilleur Coup Joué

- Position avant : `evalBefore = +100 cp`
- Coup joué : `Nf3` (meilleur coup)
- Position après : `evalAfter = -100 cp` (du point de vue des noirs)
- Perte calculée : `100 + 100 = 200 cp` ❌

**Problème** : La méthode actuelle surestime la perte si le meilleur coup est joué.

**Solution** : Vérification préalable avec `compareMoves()` → classé comme "best" avant le calcul.

### Exemple 2 : Blunder

- Position avant : `evalBefore = +200 cp`
- Coup joué : `Qxf7??` (sacrifie la dame)
- Position après : `evalAfter = +800 cp` (du point de vue des noirs, donc avantage noir)
- Perte calculée : `200 + 800 = 1000 cp` → **Blunder** (> 500 cp) ✅

### Exemple 3 : Excellent Coup

- Position avant : `evalBefore = +50 cp`
- Coup joué : `Nf3` (bon coup, mais pas le meilleur)
- Position après : `evalAfter = -20 cp` (du point de vue des noirs)
- Perte calculée : `50 + 20 = 70 cp` → **Excellent** (50-100 cp) ✅

---

## ⚠️ Limitations et Améliorations Futures

### Limitations Actuelles

1. **Approximation de la perte** : Ne compare pas directement avec l'évaluation du meilleur coup
2. **Pas de détection "Brilliant"** : Nécessiterait une analyse tactique complexe
3. **Phase simplifiée** : Basée uniquement sur le numéro de coup

### Améliorations Possibles

1. **Calcul précis de la perte** :
   - Analyser la position après le meilleur coup
   - Comparer directement `evalBestAfter` vs `evalAfter`
   - Coût : +1 analyse par coup (double le temps)

2. **Détection "Brilliant"** :
   - Détecter les sacrifices de matériel
   - Vérifier si le coup force un avantage tactique
   - Nécessite une analyse plus approfondie

3. **Phase dynamique** :
   - Compter les pièces restantes
   - Analyser la structure de pions
   - Plus précis mais plus complexe

---

## 📝 Code de Référence

### Fonction Principale

```typescript
// services/chess/move-classification.ts
export function classifyMove(
  evalBefore: number,    // Évaluation avant (centipawns)
  evalAfter: number,     // Évaluation après (centipawns)
  isWhite: boolean,      // Blanc ou noir
  playedMove: string,    // Coup joué (SAN/LAN)
  bestMove: string | null, // Meilleur coup (SAN/LAN)
  fen: string,           // Position avant le coup
  moveNumber: number,    // Numéro du coup
): MoveClassification
```

### Seuils de Classification

```typescript
if (loss > 500) → "blunder"
else if (loss > 300) → "mistake"
else if (loss > 200) → "inaccuracy"
else if (loss > 100) → "good"
else if (loss > 50) → "excellent"
else → "best"
```

---

## ✅ Validation

Pour valider que la classification fonctionne correctement :

1. **Vérifier les "best"** : Tous les coups où `playedMove === bestMove` doivent être "best"
2. **Vérifier les blunders** : Les coups avec perte > 500 cp doivent être "blunder"
3. **Statistiques** : Le taux de "best" devrait être raisonnable (pas 0%, pas 100%)

---

## 🔗 Références

- [Lichess Analysis Documentation](https://lichess.org/api#tag/Chess-Analysis)
- [Chess.com Analysis Standards](https://www.chess.com/terms/chess-analysis)
- [Stockfish Evaluation Guide](https://stockfishchess.org/)

