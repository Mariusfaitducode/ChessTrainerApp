# 📊 Bilan d'avancement : Mode Guest avec Onboarding Progressif

**Date** : Décembre 2024  
**Objectif** : Implémenter l'authentification optionnelle avec mode guest et migration transparente

---

## 🎯 Objectif initial

Permettre l'utilisation de l'application **sans compte** avec :
- ✅ Stockage local des données (AsyncStorage)
- ✅ Migration automatique vers Supabase lors de la création de compte
- ✅ Prompts contextuels pour encourager la création de compte
- ✅ Expérience utilisateur fluide sans friction à l'entrée

**Stratégie choisie** : **Progressive Onboarding (Stratégie 4)**

---

## ✅ Ce qui a été fait

### Phase 1 : Infrastructure (✅ 100%)

1. ✅ **`types/guest.ts`** - Types TypeScript pour les données guest
2. ✅ **`utils/local-storage.ts`** - Gestion complète du stockage local
   - Games, Platforms, Analyses, Exercises
   - Méthodes CRUD complètes
   - Gestion de la migration
3. ✅ **`hooks/useGuestMode.ts`** - Hook pour détecter le mode guest
4. ✅ **`app/_layout.tsx`** - Routing modifié pour permettre l'accès sans session

### Phase 2 : Hooks de base (✅ 100%)

1. ✅ **`hooks/useChessPlatform.ts`** - Adapté pour mode guest
2. ✅ **`hooks/useGames.ts`** - Adapté pour mode guest avec calcul de `analyzed_at` et `blunders_count`
3. ✅ **`hooks/useSyncGames.ts`** - Adapté pour stocker localement en mode guest

### Phase 3 : Features avancées (✅ 100%)

1. ✅ **`hooks/useGame.ts`** - Adapté pour récupérer depuis LocalStorage
2. ✅ **`hooks/useAnalyzeGame.ts`** - Adapté pour stocker les analyses localement
3. ✅ **`hooks/useAnalyzeGames.ts`** - Adapté pour mode guest
4. ✅ **`hooks/useExercises.ts`** - Adapté pour récupérer et enrichir les exercices en mode guest
5. ✅ **`hooks/useExercise.ts`** - Adapté pour mode guest
6. ✅ **`app/(protected)/exercise/[id].tsx`** - Corrigé pour utiliser DataService au lieu de Supabase direct

### Refactorisation majeure (✅ 100%)

1. ✅ **`services/data/data-service.ts`** - **NOUVEAU** : Abstraction unifiée
   - Interface `DataService` qui cache la différence guest/authentifié
   - Implémentations `createGuestDataService()` et `createAuthenticatedDataService()`
   - Plus besoin de conditions `if (isGuest)` partout dans le code
2. ✅ **`hooks/useDataService.ts`** - Hook pour obtenir le service unifié
3. ✅ **Tous les hooks refactorisés** pour utiliser `useDataService()` au lieu de gérer directement les conditions

**Bénéfices de la refactorisation** :
- ✅ Code plus maintenable et scalable
- ✅ Plus de conditions `if (isGuest)` dispersées
- ✅ Architecture claire avec séparation des responsabilités
- ✅ Facilite les tests et l'évolution future

---

## ⏳ Ce qui reste à faire

### Phase 4 : Migration (⏳ 0%)

**Objectif** : Migrer automatiquement les données guest vers Supabase lors de la création de compte

1. ⏳ **`utils/migration.ts`** - Fonction de migration complète
   - Migrer les plateformes
   - Migrer les parties (avec détection de doublons)
   - Migrer les analyses (avec mapping des game_id)
   - Migrer les exercices (avec mapping des game_id et game_analysis_id)
   - Nettoyer le cache local après migration
   - **Complexité** : 🟡 Moyenne (3-4h)

2. ⏳ **`hooks/useSupabase.ts`** - Intégrer la migration
   - Détecter la connexion d'un utilisateur guest
   - Appeler `migrateGuestDataToDB()` automatiquement
   - Gérer les erreurs de migration
   - **Complexité** : 🟡 Moyenne (1-2h)

**Points d'attention** :
- Mapping des IDs temporaires (guest) vers les IDs DB
- Gestion des doublons (parties déjà existantes)
- Mapping des références (exercices → games/analyses)

---

### Phase 5 : UI et prompts (⏳ 0%)

**Objectif** : Ajouter les prompts contextuels et l'indicateur mode guest

1. ⏳ **`hooks/usePrompts.ts`** - Hook pour gérer les prompts
   - Détecter quand afficher les prompts (seuils : 5 parties, 3 exercices)
   - Gérer l'état des prompts déjà affichés (AsyncStorage)
   - **Complexité** : 🟢 Faible (1-2h)

2. ⏳ **`components/prompts/SignUpPrompt.tsx`** - Composant modal
   - Modal avec emoji, titre, message
   - Boutons "Plus tard" et "Créer un compte"
   - Deux variantes : "sync" et "exercise"
   - **Complexité** : 🟢 Faible (1h)

3. ⏳ **`components/prompts/GuestIndicator.tsx`** - Indicateur discret
   - Bandeau discret en haut de l'app
   - Lien vers la création de compte
   - **Complexité** : 🟢 Très faible (30 min)

4. ⏳ **Intégration dans les écrans** :
   - `app/(protected)/(tabs)/games.tsx` - Ajouter `GuestIndicator` et `SignUpPrompt` (sync)
   - `app/(protected)/(tabs)/exercises.tsx` - Ajouter `SignUpPrompt` (exercise)
   - `app/(protected)/(tabs)/profile.tsx` - Adapter pour mode guest (masquer sections compte)
   - **Complexité** : 🟢 Faible (1-2h)

---

## 📈 État d'avancement global

### Par phase

| Phase | Statut | Progression |
|-------|--------|-------------|
| Phase 1 : Infrastructure | ✅ | 100% |
| Phase 2 : Hooks de base | ✅ | 100% |
| Phase 3 : Features avancées | ✅ | 100% |
| Refactorisation DataService | ✅ | 100% |
| Phase 4 : Migration | ⏳ | 0% |
| Phase 5 : UI et prompts | ⏳ | 0% |

### Global

**Progression totale** : **~70%** ✅

- ✅ **Fonctionnel** : L'app fonctionne complètement en mode guest
  - Ajout de plateformes
  - Synchronisation de parties
  - Analyse de parties
  - Résolution d'exercices
  - Affichage des données (parties analysées, exercices)

- ⏳ **Manquant** :
  - Migration automatique lors de la création de compte
  - Prompts contextuels pour encourager la création de compte
  - Indicateur mode guest dans l'UI

---

## 🎯 Prochaines étapes recommandées

### Priorité 1 : Migration (Phase 4)

**Pourquoi** : Essentiel pour que les utilisateurs ne perdent pas leurs données lors de la création de compte.

**Ordre d'implémentation** :
1. Créer `utils/migration.ts` avec la logique complète
2. Tester la migration avec des données de test
3. Intégrer dans `useSupabase.ts`
4. Tester le flux complet : guest → création compte → migration

### Priorité 2 : UI et prompts (Phase 5)

**Pourquoi** : Améliore l'expérience utilisateur et encourage la conversion.

**Ordre d'implémentation** :
1. Créer `hooks/usePrompts.ts`
2. Créer `components/prompts/SignUpPrompt.tsx`
3. Créer `components/prompts/GuestIndicator.tsx`
4. Intégrer dans les écrans
5. Tester les prompts (seuils, dismiss, navigation)

---

## 🐛 Bugs connus / Points d'attention

### ✅ Résolus
- ✅ Parties analysées non affichées en mode guest → **Corrigé** (calcul de `analyzed_at` dans DataService)
- ✅ Exercices non affichés en mode guest → **Corrigé** (adaptation de `useExercises`)
- ✅ Requêtes Supabase en mode guest lors de la résolution d'exercice → **Corrigé** (utilisation de DataService)

### ⚠️ À surveiller
- Mapping des IDs lors de la migration (exercices → games/analyses)
- Performance avec beaucoup de données en LocalStorage
- Gestion des erreurs de migration

---

## 📝 Notes techniques

### Architecture actuelle

```
┌─────────────────────────────────────────┐
│         Hooks (useGames, etc.)          │
│              ↓                           │
│      useDataService()                    │
│              ↓                           │
│    createDataService()                   │
│         ↙         ↘                      │
│  GuestDataService  AuthenticatedDataService
│         ↓                ↓              │
│   LocalStorage      Supabase             │
└─────────────────────────────────────────┘
```

**Avantages** :
- ✅ Séparation claire des responsabilités
- ✅ Pas de conditions `if (isGuest)` dans les hooks
- ✅ Facile à tester et maintenir
- ✅ Scalable pour ajouter de nouvelles features

---

## 🎉 Conclusion

**État actuel** : L'application fonctionne **complètement en mode guest** avec toutes les fonctionnalités principales. La refactorisation avec DataService a grandement amélioré l'architecture.

**Reste à faire** : 
- Migration automatique (essentiel pour ne pas perdre les données)
- Prompts contextuels (améliore l'UX et la conversion)

**Estimation restante** : **~6-8 heures** (1 journée de développement)

---

**Dernière mise à jour** : Décembre 2024

