# Guide de migration - Simplification OAuth → Username

## 🔄 Changements majeurs

L'application passe d'un système OAuth complexe à une approche plus simple basée sur les **usernames** et les **APIs publiques**.

### Avant (OAuth)
- Nécessitait la création d'apps OAuth sur chaque plateforme
- Gestion de tokens d'accès/refresh
- Flow de redirection complexe
- Limitations: Chess.com ne supporte pas OAuth

### Après (Username-based)
- ✅ Plus simple: juste entrer un username
- ✅ Fonctionne avec l'API publique Chess.com
- ✅ Pas besoin de configurer OAuth
- ✅ Peut analyser n'importe quel username public

## 📋 Étapes de migration

### 1. Mettre à jour la base de données

Si tu as déjà créé la table `user_platforms` avec les colonnes de tokens, exécute la migration :

```sql
-- Dans Supabase SQL Editor
ALTER TABLE user_platforms 
  DROP COLUMN IF EXISTS access_token,
  DROP COLUMN IF EXISTS refresh_token;
```

Sinon, utilise le nouveau schéma simplifié : `supabase/schema_simplified.sql`

### 2. Retirer les variables d'environnement OAuth

Tu n'as plus besoin de ces variables dans ton `.env` :

```env
# ❌ Plus besoin de ça
# EXPO_PUBLIC_CHESSCOM_CLIENT_ID=...
# EXPO_PUBLIC_CHESSCOM_CLIENT_SECRET=...
# EXPO_PUBLIC_LICHESS_CLIENT_ID=...
# EXPO_PUBLIC_LICHESS_CLIENT_SECRET=...
```

### 3. Supprimer les fichiers OAuth (optionnel)

Les fichiers suivants ne sont plus utilisés (tu peux les supprimer) :
- `services/chesscom/oauth.ts`
- `services/lichess/oauth.ts`
- `OAUTH_SETUP.md`

### 4. Nettoyer les dépendances (optionnel)

Tu n'as plus besoin de ces packages si tu ne les utilises pas ailleurs :
- `expo-auth-session` (peut être gardé si tu veux OAuth pour Lichess plus tard)
- `expo-web-browser` (peut être gardé)

## ✅ Ce qui fonctionne maintenant

### Services API créés

1. **Chess.com API** (`services/chesscom/api.ts`)
   - `getPlayerProfile(username)` - Vérifier qu'un joueur existe
   - `getPlayerArchives(username)` - Liste des mois disponibles
   - `getPlayerGames(username, year, month)` - Parties d'un mois
   - `getAllPlayerGames(username, maxMonths)` - Récupérer plusieurs mois

2. **Lichess API** (`services/lichess/api.ts`)
   - `getUserProfile(username)` - Profil d'un joueur
   - `getUserGames(username, max, since)` - Parties récentes
   - `getGamePGN(gameId)` - PGN d'une partie spécifique

### Interface utilisateur

- **Profile tab** : Permet d'ajouter un username pour chaque plateforme
- Modal pour saisir le username
- Validation automatique (vérifie que le joueur existe)
- Affichage des usernames connectés

## 🎯 Utilisation

### Pour l'utilisateur

1. Va dans l'onglet **Profil**
2. Clique sur **"Ajouter un username"** pour Lichess ou Chess.com
3. Entre le nom d'utilisateur (ex: `magnuscarlsen` pour Chess.com)
4. Le système valide que le joueur existe
5. Les parties peuvent ensuite être synchronisées

### Pour le développeur

```typescript
// Exemple : récupérer les parties d'un joueur Chess.com
import { getAllPlayerGames } from '@/services/chesscom/api';

const games = await getAllPlayerGames('magnuscarlsen', 12); // 12 derniers mois
```

## 📝 Prochaines étapes

1. ✅ Base de données simplifiée
2. ✅ Services API créés
3. ✅ UI mise à jour
4. ⏳ Créer le service de synchronisation des parties
5. ⏳ Créer le hook `useSyncGames` pour récupérer et stocker les parties
6. ⏳ Mettre à jour `useGames` pour utiliser les parties stockées

## 🔍 Notes importantes

- **APIs publiques** : Les données sont publiques, pas besoin d'authentification
- **Rate limiting** : Respecter les limites des APIs (surtout Chess.com)
- **Données** : On peut analyser n'importe quel username public, pas seulement celui de l'utilisateur
- **Sécurité** : Plus besoin de stocker des tokens sensibles

## 🐛 Dépannage

### "Le joueur n'existe pas"
- Vérifie l'orthographe du username
- Les usernames sont sensibles à la casse pour Chess.com
- Pour Lichess, vérifie sur lichess.org

### Rate limiting
- Chess.com : Ne fait pas trop de requêtes en parallèle
- Attendre entre les requêtes si nécessaire
