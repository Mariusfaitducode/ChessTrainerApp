# Migration vers `classifyMove` - Classification Complète des Coups

## 📋 Changements Apportés

### 1. **Nouvelle Fonction `classifyMove`**

**Fichier** : `services/chess/move-classification.ts`

Remplace `classifyMistake` avec une classification complète :

- **`move_quality`** : Qualité du coup
  - `"best"` : Meilleur coup (joué = best_move)
  - `"excellent"` : Coup excellent (perte < 10 centipawns)
  - `"good"` : Bon coup (perte < 50 centipawns)
  - `"inaccuracy"` : Imprécision (perte 50-100 centipawns)
  - `"mistake"` : Erreur (perte 100-200 centipawns)
  - `"blunder"` : Erreur grave (perte > 200 centipawns)

- **`game_phase`** : Phase de la partie
  - `"opening"` : Coups 1-15
  - `"middlegame"` : Coups 16-40
  - `"endgame"` : Coups 41+

- **`evaluation_loss`** : Perte d'évaluation en centipawns (0 si meilleur coup)

- **`mistake_level`** : Conservé pour compatibilité (null si bon coup)

### 2. **Amélioration de la Logique**

**Avant** (`classifyMistake`) :
- Ne vérifiait pas si le coup joué était le meilleur
- Classifiait uniquement les erreurs
- Ne donnait pas d'information sur la qualité des bons coups

**Après** (`classifyMove`) :
- ✅ Vérifie si `playedMove === bestMove` (utilise `compareMoves` pour gérer LAN vs SAN)
- ✅ Classifie tous les coups (bons et mauvais)
- ✅ Détermine la phase de partie
- ✅ Calcule la perte d'évaluation précise

### 3. **Migration de la Base de Données**

**Fichier** : `supabase/migrations/20240101000000_add_move_classification.sql`

Ajoute 3 nouvelles colonnes à `game_analyses` :
- `move_quality TEXT` : Qualité du coup
- `game_phase TEXT` : Phase de partie
- `evaluation_loss INTEGER` : Perte en centipawns

**Index créés** :
- `idx_game_analyses_move_quality` : Pour filtrer par qualité
- `idx_game_analyses_game_phase` : Pour filtrer par phase

### 4. **Mise à Jour des Types**

**Fichier** : `types/database.ts`

```typescript
export interface GameAnalysis extends GameAnalysisRow {
  move_quality?: MoveQuality | null;
  game_phase?: GamePhase | null;
  evaluation_loss?: number | null;
}
```

### 5. **Mise à Jour des Composants**

#### `hooks/useGames.ts`
- Récupère `move_quality` en plus de `mistake_level`
- Compte les blunders avec `move_quality === "blunder"` (fallback sur `mistake_level`)

#### `hooks/useGame.ts`
- Récupère `move_quality`, `game_phase`, `evaluation_loss`

#### `app/(protected)/game/[id].tsx`
- Affiche la qualité du coup (⭐ Meilleur, ✨ Excellent, ✓ Bon)
- Affiche la phase de partie (📖 Ouverture, ⚔️ Milieu, 🏁 Finale)

## 🚀 Migration

### Étape 1 : Appliquer la Migration SQL

```bash
# Via Supabase CLI
supabase db push

# Ou directement dans Supabase Dashboard
# Exécuter le contenu de supabase/migrations/20240101000000_add_move_classification.sql
```

### Étape 2 : Réanalyser les Parties Existantes (Optionnel)

Les nouvelles colonnes seront `NULL` pour les analyses existantes. Pour les remplir :

1. Option A : Réanalyser les parties (recommandé pour avoir des données cohérentes)
2. Option B : Créer un script de migration qui recalcule `move_quality` et `game_phase` depuis les données existantes

### Étape 3 : Vérifier les Données

Après la migration, vérifier que :
- Les nouvelles analyses ont `move_quality`, `game_phase`, `evaluation_loss`
- Le comptage des blunders dans `GameCard` fonctionne correctement
- L'affichage dans `game/[id].tsx` montre les nouvelles informations

## 📊 Impact sur les Statistiques

### Avant
- Seuls les erreurs étaient classifiées
- Pas de distinction entre "bon" et "excellent"
- Pas d'information sur la phase de partie

### Après
- Tous les coups sont classifiés
- Distinction claire entre les niveaux de qualité
- Statistiques par phase de partie possibles

## 🔍 Exemples d'Utilisation

### Filtrer les Meilleurs Coups
```sql
SELECT * FROM game_analyses 
WHERE move_quality = 'best';
```

### Statistiques par Phase
```sql
SELECT 
  game_phase,
  COUNT(*) as total_moves,
  COUNT(*) FILTER (WHERE move_quality = 'best') as best_moves,
  COUNT(*) FILTER (WHERE move_quality = 'blunder') as blunders
FROM game_analyses
GROUP BY game_phase;
```

### Moyenne de Perte d'Évaluation
```sql
SELECT 
  AVG(evaluation_loss) as avg_loss
FROM game_analyses
WHERE evaluation_loss > 0;
```

## ✅ Checklist de Migration

- [x] Créer `move-classification.ts` avec `classifyMove`
- [x] Mettre à jour `analyzer.ts` pour utiliser `classifyMove`
- [x] Créer la migration SQL
- [x] Mettre à jour les types TypeScript
- [x] Mettre à jour `useGames.ts` pour compter les blunders
- [x] Mettre à jour `useGame.ts` pour récupérer les nouvelles colonnes
- [x] Mettre à jour `game/[id].tsx` pour afficher les nouvelles infos
- [ ] Appliquer la migration SQL en production
- [ ] Tester avec de nouvelles analyses
- [ ] (Optionnel) Migrer les analyses existantes

