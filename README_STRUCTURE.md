# Structure du projet

## 📁 Organisation des dossiers

```
expo-supabase-starter/
├── app/                      # Routes Expo Router
│   ├── (protected)/          # Routes protégées (nécessite auth)
│   │   ├── (tabs)/           # Navigation par onglets
│   │   │   ├── index.tsx     # Dashboard
│   │   │   ├── games.tsx     # Liste des parties
│   │   │   ├── exercises.tsx # Liste des exercices
│   │   │   └── profile.tsx   # Profil utilisateur
│   │   └── _layout.tsx
│   └── (public)/              # Routes publiques
│       ├── welcome.tsx
│       ├── sign-in.tsx
│       └── sign-up.tsx
│
├── components/               # Composants réutilisables
│   ├── chess/               # Composants échecs
│   │   ├── Chessboard.tsx   # Échiquier (placeholder)
│   │   ├── MoveList.tsx     # Liste des coups
│   │   └── AnalysisBar.tsx  # Barre d'évaluation
│   ├── games/               # Composants parties
│   │   └── GameCard.tsx     # Carte de partie
│   └── exercises/           # Composants exercices
│       └── ExerciseCard.tsx # Carte d'exercice
│
├── hooks/                   # Hooks React
│   ├── useSupabase.ts       # Hook Supabase de base
│   ├── useGames.ts          # Gestion des parties
│   ├── useGame.ts           # Détail d'une partie
│   ├── useExercises.ts      # Gestion des exercices
│   ├── useSignIn.ts
│   └── useSignUp.ts
│
├── providers/               # Context Providers
│   ├── supabase-provider.tsx
│   └── query-provider.tsx   # React Query
│
├── services/                # Services (à créer)
│   ├── lichess/            # API Lichess
│   ├── chesscom/           # API Chess.com
│   └── chess/              # Logique échecs (analyse, etc.)
│
├── types/                   # Types TypeScript
│   ├── chess.ts
│   ├── games.ts
│   └── exercises.ts
│
├── utils/                   # Utilitaires
│   ├── date.ts             # Formatage dates
│   ├── chess.ts            # Helpers échecs
│   └── index.ts            # Exports
│
└── supabase/               # Schéma DB
    └── schema.sql          # Migration SQL
```

## 🎯 Architecture

### Providers
- **SupabaseProvider**: Client Supabase avec gestion de session
- **QueryProvider**: React Query pour cache et requêtes

### Hooks
- **useGames**: Liste et synchronisation des parties
- **useGame**: Détail d'une partie avec analyses
- **useExercises**: Liste et gestion des exercices

### Navigation
- **Tabs**: Dashboard, Parties, Exercices, Profil
- **Routes protégées**: Redirection automatique si non connecté
- **Routes publiques**: Welcome, Sign In, Sign Up

### Composants principaux
- **GameCard**: Affichage d'une partie dans une liste
- **ExerciseCard**: Affichage d'un exercice
- **ChessboardWrapper**: Placeholder pour l'échiquier (à implémenter)
- **MoveList**: Liste des coups d'une partie
- **AnalysisBar**: Barre d'évaluation de position

## 🔄 Flux de données

```
User Action
    ↓
Hook (useGames, useExercises, etc.)
    ↓
React Query (cache)
    ↓
Supabase Client
    ↓
Supabase Database
```

## 📝 Prochaines étapes

1. **Services API** (à créer)
   - `services/lichess/api.ts`
   - `services/chesscom/api.ts`
   - `services/chess/analyzer.ts`

2. **Pages détail** (à créer)
   - `app/(protected)/game/[id].tsx`
   - `app/(protected)/exercise/[id].tsx`

3. **Composant échiquier**
   - Implémenter avec react-chessboard (web) ou alternative native

4. **OAuth**
   - Connexion Lichess/Chess.com
   - Stockage tokens
