# Status de l'implémentation du Mode Guest

## ✅ Phase 1 : Infrastructure (TERMINÉE)

### Fichiers créés
- ✅ `types/guest.ts` - Types pour le mode guest
- ✅ `utils/local-storage.ts` - Gestion du cache AsyncStorage
- ✅ `hooks/useGuestMode.ts` - Hook pour détecter le mode guest
- ✅ `utils/uuid.ts` - Utilitaire pour générer des UUID

### Fichiers modifiés
- ✅ `app/_layout.tsx` - Routing modifié pour permettre accès sans session

**Tests à effectuer :**
- [ ] Ouvrir l'app sans être connecté → Accès direct à l'app
- [ ] Hook `useGuestMode` retourne `isGuest: true` sans session
- [ ] LocalStorage peut sauvegarder/récupérer des données

---

## ✅ Phase 2 : Hooks de base (TERMINÉE)

### Fichiers modifiés
- ✅ `hooks/useChessPlatform.ts` - Support mode guest avec LocalStorage
- ✅ `hooks/useGames.ts` - Récupération depuis LocalStorage en mode guest
- ✅ `hooks/useSyncGames.ts` - Synchronisation avec stockage local en mode guest

**Tests à effectuer :**
- [ ] Peut ajouter un username en mode guest
- [ ] Username sauvegardé dans LocalStorage
- [ ] Peut synchroniser des parties en mode guest
- [ ] Parties sauvegardées dans LocalStorage
- [ ] Pas d'erreur "Vous devez être connecté"

---

## 🔄 Phase 3 : Features avancées (À VENIR)

### Fichiers à modifier
- [ ] `hooks/useAnalyzeGame.ts` - Stocker analyses localement
- [ ] `hooks/useExercises.ts` - Récupération depuis LocalStorage
- [ ] `hooks/useExercise.ts` - Adapter pour mode guest
- [ ] `utils/exercise.ts` - Adapter génération exercices

---

## 🔄 Phase 4 : Migration (À VENIR)

### Fichiers à créer
- [ ] `utils/migration.ts` - Migration automatique vers DB

### Fichiers à modifier
- [ ] `hooks/useSupabase.ts` - Déclencher migration lors de la connexion

---

## 🔄 Phase 5 : UI et Prompts (À VENIR)

### Fichiers à créer
- [ ] `hooks/usePrompts.ts` - Gestion des prompts contextuels
- [ ] `components/prompts/SignUpPrompt.tsx` - Modal de prompt
- [ ] `components/prompts/GuestIndicator.tsx` - Indicateur mode guest

### Fichiers à modifier
- [ ] `app/(protected)/(tabs)/games.tsx` - Ajouter prompts
- [ ] `app/(protected)/(tabs)/exercises.tsx` - Ajouter prompts
- [ ] `app/(protected)/(tabs)/profile.tsx` - Adapter pour mode guest

---

## 📊 Progression globale

- **Phase 1** : ✅ 100% (4/4 fichiers)
- **Phase 2** : ✅ 100% (3/3 hooks)
- **Phase 3** : ⏳ 0% (0/4 fichiers)
- **Phase 4** : ⏳ 0% (0/2 fichiers)
- **Phase 5** : ⏳ 0% (0/5 fichiers)

**Total** : **35%** (7/18 fichiers)

---

## 🧪 Tests manuels à effectuer

### Test Phase 1
1. Ouvrir l'app sans être connecté
2. Vérifier qu'on accède directement à l'app (pas de redirection)
3. Vérifier que `useGuestMode` retourne `isGuest: true`

### Test Phase 2
1. En mode guest, ajouter un username Lichess/Chess.com
2. Vérifier que l'username est sauvegardé (recharger l'app)
3. Synchroniser des parties
4. Vérifier que les parties apparaissent dans la liste
5. Vérifier que les parties sont sauvegardées (recharger l'app)

---

## ⚠️ Points d'attention

1. **IDs temporaires** : Les parties en mode guest ont des IDs générés avec `generateUUIDSync()`. Ces IDs seront remplacés lors de la migration.

2. **Doublons** : La vérification des doublons en mode guest se base sur `platform + platform_game_id`.

3. **Migration** : Les données guest seront migrées automatiquement lors de la première connexion.

4. **Limite AsyncStorage** : ~6-10MB. Surveiller la taille avec `LocalStorage.getStorageSize()`.

---

**Dernière mise à jour** : Phase 2 terminée, prêt pour Phase 3

