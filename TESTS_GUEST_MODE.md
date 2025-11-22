# Tests pour le Mode Guest

## ✅ Phase 1 : Infrastructure (TERMINÉE)

### Test 1.1 : Types créés
- [x] `types/guest.ts` existe
- [x] Types `GuestPlatform`, `GuestData` définis
- [x] Constantes `GUEST_STORAGE_KEYS` définies

### Test 1.2 : LocalStorage fonctionne
**À tester manuellement :**
```typescript
// Dans un composant de test ou console
import { LocalStorage } from '@/utils/local-storage';

// Test sauvegarde/récupération plateformes
await LocalStorage.addPlatform('lichess', 'testuser');
const platforms = await LocalStorage.getPlatforms();
// Vérifier: platforms.length === 1 && platforms[0].username === 'testuser'

// Test sauvegarde/récupération parties
const testGame = { id: 'test-1', platform: 'lichess', ... };
await LocalStorage.addGame(testGame);
const games = await LocalStorage.getGames();
// Vérifier: games.length === 1

// Test nettoyage
await LocalStorage.clearAll();
const clearedPlatforms = await LocalStorage.getPlatforms();
// Vérifier: clearedPlatforms.length === 0
```

### Test 1.3 : Hook useGuestMode
**À tester :**
- [ ] Hook retourne `isGuest: true` quand pas de session
- [ ] Hook retourne `isGuest: false` quand session existe
- [ ] Hook se met à jour quand session change

### Test 1.4 : Routing modifié
**À tester manuellement :**
- [ ] Ouvrir l'app sans être connecté → Accès direct à `(protected)`
- [ ] Pas de redirection vers `(public)` si pas de session
- [ ] Les routes `(public)` restent accessibles si pas de session

---

## 🔄 Phase 2 : Hooks de base (EN COURS)

### Test 2.1 : useChessPlatform en mode guest
**À tester :**
- [ ] Peut ajouter un username en mode guest
- [ ] Username sauvegardé dans LocalStorage
- [ ] Peut récupérer les usernames depuis LocalStorage
- [ ] Migration vers DB lors de la connexion

### Test 2.2 : useGames en mode guest
**À tester :**
- [ ] Récupère les parties depuis LocalStorage en mode guest
- [ ] Récupère les parties depuis DB en mode authentifié
- [ ] Switch automatique entre les deux modes

### Test 2.3 : useSyncGames en mode guest
**À tester :**
- [ ] Peut synchroniser des parties en mode guest
- [ ] Parties sauvegardées dans LocalStorage
- [ ] Pas d'erreur "Vous devez être connecté"
- [ ] Migration vers DB lors de la connexion

---

## 🔄 Phase 3 : Features avancées (À VENIR)

### Test 3.1 : useAnalyzeGame en mode guest
**À tester :**
- [ ] Peut analyser une partie en mode guest
- [ ] Analyses sauvegardées dans LocalStorage
- [ ] Migration vers DB lors de la connexion

### Test 3.2 : useExercises en mode guest
**À tester :**
- [ ] Peut récupérer les exercices depuis LocalStorage
- [ ] Peut mettre à jour un exercice en mode guest
- [ ] Migration vers DB lors de la connexion

---

## 🔄 Phase 4 : Migration (À VENIR)

### Test 4.1 : Migration automatique
**À tester :**
- [ ] Migration déclenchée automatiquement lors de la connexion
- [ ] Toutes les données migrées (plateformes, parties, analyses, exercices)
- [ ] Pas de doublons créés
- [ ] Cache local nettoyé après migration
- [ ] Migration ne se déclenche qu'une fois

---

## 🔄 Phase 5 : UI et Prompts (À VENIR)

### Test 5.1 : Indicateur guest
**À tester :**
- [ ] Indicateur visible en mode guest
- [ ] Indicateur masqué en mode authentifié
- [ ] Lien "Créer un compte" fonctionne

### Test 5.2 : Prompts contextuels
**À tester :**
- [ ] Prompt après 5 parties synchronisées
- [ ] Prompt après 3 exercices résolus
- [ ] Prompts dismissibles
- [ ] Prompts ne s'affichent qu'une fois

---

## 🧪 Tests de régression

### Test R.1 : Mode authentifié inchangé
**À tester :**
- [ ] Toutes les fonctionnalités existantes fonctionnent toujours
- [ ] Pas de régression dans le comportement authentifié
- [ ] Performance inchangée

### Test R.2 : Migration bidirectionnelle
**À tester :**
- [ ] Connexion → Migration guest → DB
- [ ] Déconnexion → Retour mode guest (sans données)
- [ ] Reconnexion → Pas de doublons

---

## 📝 Notes de test

- Tester sur iOS et Android si possible
- Tester avec des données réelles (vraies parties)
- Vérifier les limites (AsyncStorage ~6-10MB)
- Tester les cas limites (données vides, erreurs réseau, etc.)

