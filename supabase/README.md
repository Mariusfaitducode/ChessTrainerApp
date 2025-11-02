# Migration Supabase

## Installation du schéma

1. Ouvrir le dashboard Supabase de ton projet
2. Aller dans SQL Editor
3. Copier-coller le contenu de `schema.sql`
4. Exécuter la requête

## Configuration RLS

Le schéma active Row Level Security (RLS) pour toutes les tables. Les utilisateurs ne peuvent accéder qu'à leurs propres données.

## Note sur la sécurité des tokens

⚠️ **Important**: Les `access_token` et `refresh_token` dans `user_platforms` sont stockés en texte brut pour le moment. Pour la production, il faudra:

1. Utiliser `pgcrypto` pour chiffrer les tokens
2. Créer une fonction Supabase Edge Function pour décrypter lors de l'utilisation
3. Ou utiliser les secrets de Supabase

## Prochaines étapes

Après avoir exécuté le schéma, tu peux commencer à:
- Connecter les APIs Lichess/Chess.com
- Importer des parties
- Analyser les positions
