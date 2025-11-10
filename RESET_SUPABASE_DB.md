# 🔄 Guide pour Reset la Base de Données Supabase

## Méthode 1 : Via Supabase Dashboard (Recommandé)

### 1. Supprimer toutes les données

```sql
-- Dans Supabase SQL Editor, exécuter dans cet ordre :

-- Supprimer les données (respecter l'ordre des foreign keys)
DELETE FROM exercises;
DELETE FROM game_analyses;
DELETE FROM games;
DELETE FROM user_platforms;
```

### 2. Réinitialiser les séquences (si tu utilises des IDs auto-incrémentés)

```sql
-- Réinitialiser les séquences (si nécessaire)
-- Note: Avec UUID, pas besoin de réinitialiser
```

### 3. Vérifier que tout est vide

```sql
-- Vérifier les compteurs
SELECT 
  (SELECT COUNT(*) FROM exercises) as exercises_count,
  (SELECT COUNT(*) FROM game_analyses) as analyses_count,
  (SELECT COUNT(*) FROM games) as games_count,
  (SELECT COUNT(*) FROM user_platforms) as platforms_count;
```

**Résultat attendu** : Tous les compteurs à `0`

---

## Méthode 2 : Supprimer et Recréer le Schéma (Plus radical)

⚠️ **Attention** : Cette méthode supprime TOUT, y compris la structure des tables.

### 1. Sauvegarder le schéma actuel (optionnel)

```sql
-- Exporter le schéma actuel si tu veux le garder
-- Via Supabase Dashboard → Settings → Database → Export schema
```

### 2. Supprimer toutes les tables

```sql
-- Dans Supabase SQL Editor
DROP TABLE IF EXISTS exercises CASCADE;
DROP TABLE IF EXISTS game_analyses CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS user_platforms CASCADE;
```

### 3. Recréer le schéma

Exécuter le fichier `supabase/schema.sql` ou `supabase/schema_simplified.sql` dans le SQL Editor.

---

## Méthode 3 : Via Supabase CLI (Si tu utilises les migrations)

```bash
# 1. Reset complet (supprime toutes les migrations)
supabase db reset

# 2. Appliquer les migrations
supabase db push

# Ou appliquer une migration spécifique
supabase migration up
```

---

## Méthode 4 : Supprimer et Recréer le Projet (Ultime)

Si tu veux vraiment repartir de zéro :

1. Aller sur [Supabase Dashboard](https://app.supabase.com)
2. Sélectionner ton projet
3. Settings → General → Delete Project
4. Créer un nouveau projet
5. Exécuter `supabase/schema.sql` dans le SQL Editor

---

## Vérification après Reset

### 1. Vérifier la structure des tables

```sql
-- Lister toutes les tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

### 2. Vérifier les colonnes

```sql
-- Vérifier la structure de game_analyses (exemple)
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'game_analyses'
ORDER BY ordinal_position;
```

### 3. Vérifier les contraintes RLS

```sql
-- Vérifier que RLS est activé
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

---

## Notes importantes

- ⚠️ **Backup** : Avant de reset, exporte tes données si tu veux les garder
- 🔒 **RLS** : Les politiques RLS sont conservées si tu utilises la Méthode 1
- 📊 **Stats** : Les statistiques Supabase (Storage, etc.) ne sont pas affectées
- 👥 **Auth** : Les utilisateurs dans `auth.users` ne sont PAS supprimés (séparé de la DB publique)

---

## Commandes utiles

```sql
-- Voir toutes les données d'une table
SELECT * FROM games LIMIT 10;

-- Compter les enregistrements
SELECT COUNT(*) FROM games;

-- Voir les dernières parties importées
SELECT * FROM games ORDER BY imported_at DESC LIMIT 10;
```

---

**Recommandation** : Utilise la **Méthode 1** pour un reset simple et sûr ! 🚀

