# Prochaines étapes - Application d'échecs

## ✅ Ce qui a été fait

1. **Analyse du projet existant**
   - Structure Expo Router avec auth Supabase
   - Routes protégées/publiques configurées
   - Support web activé

2. **Plan d'architecture**
   - Document `PLAN.md` avec architecture complète
   - Phases de développement définies

3. **Schéma de base de données**
   - Fichier `supabase/schema.sql` avec toutes les tables
   - Row Level Security (RLS) configuré
   - Index pour optimiser les requêtes

4. **Types TypeScript**
   - `types/chess.ts` - Types pour échecs
   - `types/games.ts` - Types pour parties
   - `types/exercises.ts` - Types pour exercices

5. **Dépendances ajoutées** (à installer)
   - `chess.js` - Logique de jeu
   - `react-chessboard` - Visualisation échiquier
   - `@tanstack/react-query` - Cache et requêtes
   - `expo-auth-session` - OAuth
   - `pgn-parser` - Parsing PGN

## 🚀 Actions immédiates

### 1. Installer les dépendances

```bash
npm install
# ou
bun install
```

### 2. Configurer Supabase

1. Créer un projet Supabase si ce n'est pas déjà fait
2. Exécuter le schéma SQL:
   - Dashboard Supabase → SQL Editor
   - Copier/coller `supabase/schema.sql`
   - Exécuter

### 3. Configuration OAuth (Lichess/Chess.com)

#### Lichess OAuth
- Aller sur https://lichess.org/account/oauth/app/create
- Créer une app OAuth
- Callback URL: `exp://localhost:8081` (dev) ou ton scheme Expo
- Noter `Client ID` et `Client Secret`

#### Chess.com OAuth
- Aller sur https://www.chess.com/clubs/api
- Créer une app
- Configurer les redirects
- Noter les credentials

### 4. Variables d'environnement

Créer/ajouter dans `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=ton_url_supabase
EXPO_PUBLIC_SUPABASE_KEY=ton_key_supabase
EXPO_PUBLIC_LICHESS_CLIENT_ID=ton_client_id
EXPO_PUBLIC_CHESSCOM_CLIENT_ID=ton_client_id
```

## 📋 Ordre de développement recommandé

### Phase 1: Infrastructure de base (1-2 jours)
- [ ] Créer structure de dossiers (`services/`, `components/chess/`, etc.)
- [ ] Setup React Query Provider
- [ ] Créer hooks de base (`useGames`, `useExercises`)

### Phase 2: OAuth et connexion plateformes (2-3 jours)
- [ ] Service OAuth Lichess (`services/lichess/api.ts`)
- [ ] Service OAuth Chess.com (`services/chesscom/api.ts`)
- [ ] UI connexion dans Profile tab
- [ ] Stockage tokens dans Supabase

### Phase 3: Récupération parties (2-3 jours)
- [ ] Service fetch parties Lichess
- [ ] Service fetch parties Chess.com
- [ ] Parser PGN
- [ ] UI liste des parties
- [ ] Sync automatique ou manuelle

### Phase 4: Visualisation échiquier (1-2 jours)
- [ ] Composant Chessboard (react-chessboard)
- [ ] Composant MoveList
- [ ] Vue détail partie avec échiquier interactif

### Phase 5: Analyse des parties (3-5 jours)
- [ ] Setup moteur d'analyse (Stockfish.js ou API backend)
- [ ] Service d'analyse (`services/chess/analyzer.ts`)
- [ ] Détection erreurs (blunder/mistake/inaccuracy)
- [ ] Stockage analyses dans DB
- [ ] UI avec barre d'évaluation et marquage erreurs

### Phase 6: Génération exercices (2-3 jours)
- [ ] Service génération (`services/chess/exercise-generator.ts`)
- [ ] Créer exercices depuis erreurs détectées
- [ ] UI liste exercices
- [ ] Player interactif pour résoudre

### Phase 7: Polish et features bonus (ongoing)
- [ ] Design UI/UX
- [ ] Statistiques utilisateur
- [ ] Notifications
- [ ] Partage exercices

## 🔧 Ressources techniques

### APIs
- **Lichess API**: https://lichess.org/api
- **Chess.com API**: https://www.chess.com/news/view/published-data-api

### Bibliothèques
- **chess.js docs**: https://github.com/jhlywa/chess.js
- **react-chessboard**: https://github.com/Clariity/react-chessboard
- **React Query**: https://tanstack.com/query/latest

### Moteurs d'analyse
- **Stockfish.js**: https://github.com/niklasf/stockfish.js (option 1 - côté client)
- **Stockfish via Edge Function**: Supabase Edge Function (option 2 - côté serveur, plus puissant)

## 📝 Notes importantes

1. **Performance**: Pour l'analyse, considérer Edge Function Supabase avec Stockfish pour éviter de surcharger le mobile
2. **Tokens OAuth**: À crypter en production avec pgcrypto
3. **Rate limiting**: Respecter les limites des APIs Lichess/Chess.com
4. **Offline**: Considérer cache local pour parties déjà téléchargées

## 🐛 Points d'attention

- `react-chessboard` peut nécessiter des ajustements pour React Native Web
- Stockfish.js est lourd, tester sur mobile avant de commit
- APIs Lichess/Chess.com peuvent avoir des rate limits stricts
