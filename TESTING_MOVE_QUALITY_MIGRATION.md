# Guide de Test - Migration vers `move_quality`

## 📋 Vue d'Ensemble

Ce guide explique comment tester la migration de `mistake_level` vers `move_quality`.

---

## 🔧 Étape 1 : Appliquer les Migrations

### Option A : Via Supabase CLI (Recommandé)

```bash
# 1. Vérifier que vous êtes connecté
supabase status

# 2. Appliquer les migrations
supabase db push

# Ou appliquer une migration spécifique
supabase migration up 20240101000000_add_move_classification
supabase migration up 20240102000000_remove_mistake_level
```

### Option B : Via Supabase Dashboard

1. Allez dans votre projet Supabase
2. Naviguez vers **SQL Editor**
3. Exécutez les migrations dans l'ordre :
   - `20240101000000_add_move_classification.sql`
   - `20240102000000_remove_mistake_level.sql`

### Option C : Migration Manuelle (Si vous avez déjà appliqué la première)

Si vous avez déjà appliqué `20240101000000_add_move_classification.sql`, appliquez seulement :

```sql
-- Supprimer l'index
DROP INDEX IF EXISTS idx_game_analyses_mistake_level;

-- Supprimer la colonne
ALTER TABLE game_analyses
  DROP COLUMN IF EXISTS mistake_level;
```

---

## ✅ Étape 2 : Vérifier la Structure de la Base de Données

### Vérifier que les colonnes existent

```sql
-- Vérifier la structure de game_analyses
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'game_analyses'
ORDER BY ordinal_position;
```

**Résultat attendu** :
- ✅ `move_quality` (TEXT)
- ✅ `game_phase` (TEXT)
- ✅ `evaluation_loss` (INTEGER)
- ❌ `mistake_level` (ne doit plus exister)

### Vérifier les index

```sql
-- Vérifier les index sur game_analyses
SELECT 
  indexname, 
  indexdef
FROM pg_indexes
WHERE tablename = 'game_analyses';
```

**Résultat attendu** :
- ✅ `idx_game_analyses_move_quality`
- ✅ `idx_game_analyses_game_phase`
- ❌ `idx_game_analyses_mistake_level` (ne doit plus exister)

---

## 🧪 Étape 3 : Tester l'Analyse d'une Partie

### 3.1 Analyser une Nouvelle Partie

1. **Lancer l'application**
   ```bash
   npm start
   # ou
   expo start
   ```

2. **Importer une partie** (si vous n'en avez pas)
   - Allez dans l'onglet "Games"
   - Importez une partie depuis Lichess ou Chess.com

3. **Lancer l'analyse**
   - Cliquez sur une partie non analysée
   - Cliquez sur "Analyser"
   - Attendez la fin de l'analyse

### 3.2 Vérifier les Données dans la Base

```sql
-- Vérifier que les analyses ont move_quality
SELECT 
  id,
  move_number,
  played_move,
  best_move,
  move_quality,
  game_phase,
  evaluation_loss,
  mistake_level  -- Cette colonne ne doit plus exister (erreur attendue)
FROM game_analyses
WHERE game_id = 'VOTRE_GAME_ID'
ORDER BY move_number
LIMIT 10;
```

**Vérifications** :
- ✅ `move_quality` est rempli (best, excellent, good, inaccuracy, mistake, ou blunder)
- ✅ `game_phase` est rempli (opening, middlegame, ou endgame)
- ✅ `evaluation_loss` est rempli (nombre en centipawns)
- ❌ `mistake_level` ne doit plus exister (erreur SQL attendue)

### 3.3 Vérifier la Distribution des Qualités

```sql
-- Statistiques sur move_quality
SELECT 
  move_quality,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM game_analyses
WHERE move_quality IS NOT NULL
GROUP BY move_quality
ORDER BY 
  CASE move_quality
    WHEN 'best' THEN 1
    WHEN 'excellent' THEN 2
    WHEN 'good' THEN 3
    WHEN 'inaccuracy' THEN 4
    WHEN 'mistake' THEN 5
    WHEN 'blunder' THEN 6
  END;
```

**Résultat attendu** : Distribution raisonnable (pas 100% blunder, pas 0% best)

---

## 🎯 Étape 4 : Tester la Génération d'Exercices

### 4.1 Vérifier que seuls les Blunders génèrent des Exercices

```sql
-- Vérifier les exercices générés
SELECT 
  e.id,
  e.exercise_type,
  e.correct_move,
  ga.move_quality,
  ga.evaluation_loss
FROM exercises e
JOIN game_analyses ga ON e.game_analysis_id = ga.id
ORDER BY e.created_at DESC
LIMIT 20;
```

**Vérifications** :
- ✅ Tous les exercices doivent avoir `move_quality = 'blunder'`
- ✅ `evaluation_loss` doit être > 500 (centipawns)

### 4.2 Tester la Génération d'Exercices

1. **Analyser une partie avec des blunders**
   - Utilisez une partie où vous avez fait des erreurs
   - Lancez l'analyse

2. **Vérifier dans l'application**
   - Allez dans l'onglet "Exercises"
   - Vous devriez voir des exercices générés uniquement pour les blunders

3. **Vérifier dans la base de données**

```sql
-- Compter les exercices par qualité de coup
SELECT 
  ga.move_quality,
  COUNT(DISTINCT e.id) as exercise_count
FROM game_analyses ga
LEFT JOIN exercises e ON e.game_analysis_id = ga.id
WHERE ga.move_quality IS NOT NULL
GROUP BY ga.move_quality
ORDER BY exercise_count DESC;
```

**Résultat attendu** :
- ✅ Seuls les `blunder` ont des exercices (`exercise_count > 0`)
- ✅ Les autres qualités ont `exercise_count = 0`

---

## 📊 Étape 5 : Tester l'Affichage dans l'Application

### 5.1 Visualisation d'une Partie

1. **Ouvrir une partie analysée**
   - Allez dans "Games"
   - Cliquez sur une partie avec `analyzed_at` non null

2. **Vérifier l'affichage**
   - ✅ La barre d'analyse affiche la qualité du coup
   - ✅ La liste des coups colore les erreurs (blunder, mistake, inaccuracy)
   - ✅ Les informations affichent la phase de partie

### 5.2 Test des Couleurs dans MoveList

**Vérifications visuelles** :
- ✅ Coups en rouge = blunder
- ✅ Coups en orange = mistake
- ✅ Coups en jaune = inaccuracy
- ✅ Coups normaux = best, excellent, good

### 5.3 Test de l'AnalysisBar

**Vérifications** :
- ✅ Affiche "Erreur grave" pour blunder
- ✅ Affiche "Erreur" pour mistake
- ✅ Affiche "Imprécision" pour inaccuracy
- ✅ N'affiche rien pour best, excellent, good

---

## 🐛 Étape 6 : Tests de Régression

### 6.1 Vérifier le Comptage des Blunders

```sql
-- Compter les blunders par partie
SELECT 
  g.id,
  g.white_player,
  g.black_player,
  COUNT(CASE WHEN ga.move_quality = 'blunder' THEN 1 END) as blunder_count
FROM games g
LEFT JOIN game_analyses ga ON ga.game_id = g.id
WHERE g.analyzed_at IS NOT NULL
GROUP BY g.id, g.white_player, g.black_player
ORDER BY blunder_count DESC
LIMIT 10;
```

**Vérifications** :
- ✅ Le comptage fonctionne correctement
- ✅ Les parties sans blunders ont `blunder_count = 0`

### 6.2 Vérifier dans GameCard

1. **Vérifier l'affichage du badge de blunders**
   - Les parties avec blunders affichent le badge avec le nombre
   - Les parties sans blunders n'affichent pas le badge

---

## ⚠️ Problèmes Potentiels et Solutions

### Problème 1 : Erreur "Column mistake_level does not exist"

**Cause** : Le code essaie encore d'accéder à `mistake_level`

**Solution** :
1. Vérifier que tous les fichiers ont été mis à jour
2. Redémarrer l'application
3. Vérifier les logs pour trouver où `mistake_level` est encore utilisé

### Problème 2 : Aucun exercice généré

**Causes possibles** :
- Aucun blunder dans les parties analysées
- La génération d'exercices n'a pas été déclenchée

**Solution** :
```sql
-- Vérifier s'il y a des blunders
SELECT COUNT(*) 
FROM game_analyses 
WHERE move_quality = 'blunder';

-- Vérifier si des exercices existent
SELECT COUNT(*) 
FROM exercises;
```

### Problème 3 : Migration échoue avec "column is referenced"

**Cause** : Des contraintes ou vues référencent `mistake_level`

**Solution** :
```sql
-- Vérifier les dépendances
SELECT 
  dependent_ns.nspname as dependent_schema,
  dependent_view.relname as dependent_view,
  source_ns.nspname as source_schema,
  source_table.relname as source_table
FROM pg_depend
JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid
JOIN pg_class as source_table ON pg_depend.refobjid = source_table.oid
JOIN pg_namespace dependent_ns ON dependent_view.relnamespace = dependent_ns.oid
JOIN pg_namespace source_ns ON source_table.relnamespace = source_ns.oid
WHERE source_table.relname = 'game_analyses';
```

---

## 📝 Checklist de Test

- [ ] Migrations appliquées avec succès
- [ ] Colonne `mistake_level` supprimée
- [ ] Colonnes `move_quality`, `game_phase`, `evaluation_loss` existent
- [ ] Index `idx_game_analyses_move_quality` existe
- [ ] Index `idx_game_analyses_mistake_level` supprimé
- [ ] Analyse d'une partie fonctionne
- [ ] Les analyses ont `move_quality` rempli
- [ ] Distribution des qualités raisonnable
- [ ] Génération d'exercices fonctionne
- [ ] Seuls les blunders génèrent des exercices
- [ ] Affichage dans `game/[id].tsx` fonctionne
- [ ] Affichage dans `MoveList` fonctionne
- [ ] Affichage dans `AnalysisBar` fonctionne
- [ ] Comptage des blunders dans `GameCard` fonctionne
- [ ] Aucune erreur dans les logs

---

## 🔍 Requêtes SQL Utiles pour le Debug

```sql
-- Voir toutes les analyses récentes
SELECT 
  ga.*,
  g.white_player,
  g.black_player
FROM game_analyses ga
JOIN games g ON ga.game_id = g.id
ORDER BY ga.created_at DESC
LIMIT 20;

-- Vérifier les exercices et leurs analyses associées
SELECT 
  e.id as exercise_id,
  e.correct_move,
  ga.move_quality,
  ga.evaluation_loss,
  ga.played_move,
  ga.best_move
FROM exercises e
JOIN game_analyses ga ON e.game_analysis_id = ga.id
ORDER BY e.created_at DESC
LIMIT 10;

-- Statistiques globales
SELECT 
  COUNT(*) as total_analyses,
  COUNT(CASE WHEN move_quality = 'blunder' THEN 1 END) as blunders,
  COUNT(CASE WHEN move_quality = 'mistake' THEN 1 END) as mistakes,
  COUNT(CASE WHEN move_quality = 'inaccuracy' THEN 1 END) as inaccuracies,
  COUNT(CASE WHEN move_quality = 'good' THEN 1 END) as good,
  COUNT(CASE WHEN move_quality = 'excellent' THEN 1 END) as excellent,
  COUNT(CASE WHEN move_quality = 'best' THEN 1 END) as best
FROM game_analyses;
```

---

## ✅ Validation Finale

Une fois tous les tests passés, la migration est réussie ! 🎉

