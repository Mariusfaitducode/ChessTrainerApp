# Analyse : Authentification optionnelle

## 🎯 Contexte

Actuellement, l'application **exige** une authentification dès l'arrivée sur l'app. Cependant :
- Les données Lichess/Chess.com sont **publiques** (pas besoin de compte pour les consulter)
- L'authentification est principalement nécessaire pour :
  - **Stocker** les parties, analyses et exercices en DB
  - **Suivre la progression** sur les exercices
  - **Synchroniser** les données entre appareils

**Question** : Peut-on permettre une utilisation sans compte tout en gardant les avantages d'un compte pour le suivi ?

---

## 📊 État actuel : Dépendances à l'authentification

### 1. Navigation et routing

**Fichier** : `app/_layout.tsx`

```typescript
<Stack.Protected guard={!!session}>
  <Stack.Screen name="(protected)" />
</Stack.Protected>

<Stack.Protected guard={!session}>
  <Stack.Screen name="(public)" />
</Stack.Protected>
```

**Impact** : ⚠️ **Blocant**
- Si pas de session → redirection vers `(public)` (welcome/sign-in/sign-up)
- Impossible d'accéder aux features sans compte

**Complexité pour changer** : 🟢 **Faible** (1-2h)
- Modifier la guard pour permettre l'accès même sans session
- Ajouter une route "guest" ou modifier la logique de routing

---

### 2. Base de données et RLS (Row Level Security)

**Fichier** : `supabase/schema.sql`

Toutes les tables utilisent `auth.uid()` dans les policies :

```sql
CREATE POLICY "Users can view own games" ON games
  FOR SELECT USING (auth.uid() = user_id);
```

**Impact** : 🔴 **Très bloquant**
- Sans session → **aucune requête DB ne fonctionne**
- Impossible de lire/écrire dans Supabase sans `auth.uid()`

**Complexité pour changer** : 🟡 **Moyenne** (1-2 jours)
- Modifier les policies pour permettre les requêtes anonymes
- Créer des policies conditionnelles : `auth.uid() = user_id OR auth.uid() IS NULL`
- ⚠️ **Risque de sécurité** : Nécessite une gestion fine des permissions

---

### 3. Hooks et services

#### `useSyncGames` (`hooks/useSyncGames.ts`)

**Dépendances** :
- `session.user.id` pour insérer les parties (ligne 100)
- `session.user.id` pour vérifier les doublons (ligne 124)
- `user_platforms` stockés en DB (nécessite auth)

**Impact** : 🔴 **Bloquant pour le stockage**
- ✅ Récupération depuis APIs : **Possible sans auth**
- ❌ Stockage en DB : **Impossible sans auth**

**Complexité pour changer** : 🟡 **Moyenne** (2-3h)
- Permettre la récupération sans stockage
- Utiliser un cache local (AsyncStorage) pour les parties non authentifiées
- Stocker uniquement si authentifié

#### `useGames` (`hooks/useGames.ts`)

**Dépendances** :
- Requête Supabase avec RLS (nécessite session)

**Impact** : 🔴 **Bloquant**
- Impossible de lire les parties sans session

**Complexité pour changer** : 🟡 **Moyenne** (2-3h)
- Utiliser AsyncStorage pour les parties en mode guest
- Combiner cache local + DB selon l'état d'auth

#### `useChessPlatform` (`hooks/useChessPlatform.ts`)

**Dépendances** :
- `session.user.id` pour lire/écrire `user_platforms` (lignes 21, 26, 65, 88)

**Impact** : 🟡 **Partiellement bloquant**
- ✅ Validation username via API : **Possible sans auth**
- ❌ Stockage en DB : **Impossible sans auth**

**Complexité pour changer** : 🟢 **Faible** (1-2h)
- Stocker les usernames en AsyncStorage en mode guest
- Migrer vers DB lors de la connexion

#### `useAnalyzeGame` (`hooks/useAnalyzeGame.ts`)

**Dépendances** :
- `session.user.id` pour insérer les analyses (ligne 35)
- `game.id` (nécessite que la partie soit en DB)

**Impact** : 🟡 **Partiellement bloquant**
- ✅ Analyse via backend : **Possible sans auth**
- ❌ Stockage des analyses : **Impossible sans auth**

**Complexité pour changer** : 🟡 **Moyenne** (2-3h)
- Permettre l'analyse sans stockage
- Stocker en AsyncStorage en mode guest
- Migrer vers DB lors de la connexion

#### `useExercises` (`hooks/useExercises.ts`)

**Dépendances** :
- Requête Supabase avec RLS (nécessite session)

**Impact** : 🔴 **Bloquant**
- Impossible de lire les exercices sans session

**Complexité pour changer** : 🟡 **Moyenne** (2-3h)
- Utiliser AsyncStorage pour les exercices en mode guest
- Générer les exercices localement depuis les analyses en cache

---

## 💡 Stratégies possibles

### Stratégie 1 : Mode Guest avec cache local (Recommandée)

**Principe** : Permettre l'utilisation sans compte avec stockage local, migration vers DB lors de la connexion.

#### Avantages
- ✅ **Expérience utilisateur fluide** : Pas de friction à l'entrée
- ✅ **Pas de perte de données** : Migration automatique lors de la connexion
- ✅ **Sécurité maintenue** : RLS toujours actif pour les utilisateurs authentifiés
- ✅ **Progressive enhancement** : Les features premium (sync multi-appareils) nécessitent un compte

#### Inconvénients
- ⚠️ **Complexité** : Gestion de deux sources de données (local + DB)
- ⚠️ **Limitations** : Pas de sync entre appareils sans compte
- ⚠️ **Stockage local limité** : AsyncStorage a des limites (~6-10MB)

#### Implémentation

**1. Modifier le routing** (1-2h)
```typescript
// app/_layout.tsx
function RootNavigator() {
  const { isLoaded, session } = useSupabase();
  
  return (
    <Stack>
      {/* Toujours accessible, même sans session */}
      <Stack.Screen name="(protected)" />
      
      {/* Seulement si pas de session */}
      {!session && (
        <Stack.Screen name="(public)" />
      )}
    </Stack>
  );
}
```

**2. Créer un système de cache local** (1 jour)
```typescript
// utils/local-storage.ts
export const LocalStorage = {
  // Parties
  async saveGames(games: Game[]): Promise<void> {
    await AsyncStorage.setItem('guest_games', JSON.stringify(games));
  },
  
  async getGames(): Promise<Game[]> {
    const data = await AsyncStorage.getItem('guest_games');
    return data ? JSON.parse(data) : [];
  },
  
  // Usernames
  async saveUsernames(platforms: { platform: string; username: string }[]): Promise<void> {
    await AsyncStorage.setItem('guest_platforms', JSON.stringify(platforms));
  },
  
  // Analyses
  async saveAnalyses(gameId: string, analyses: GameAnalysis[]): Promise<void> {
    const key = `guest_analyses_${gameId}`;
    await AsyncStorage.setItem(key, JSON.stringify(analyses));
  },
  
  // Exercices
  async saveExercises(exercises: Exercise[]): Promise<void> {
    await AsyncStorage.setItem('guest_exercises', JSON.stringify(exercises));
  },
};
```

**3. Adapter les hooks** (2-3 jours)
```typescript
// hooks/useGames.ts
export const useGames = () => {
  const { supabase, session } = useSupabase();
  
  return useQuery({
    queryKey: ["games", session?.user?.id || "guest"],
    queryFn: async () => {
      if (session?.user) {
        // Mode authentifié : DB
        const { data } = await supabase.from("games").select("*");
        return data;
      } else {
        // Mode guest : LocalStorage
        return await LocalStorage.getGames();
      }
    },
  });
};
```

**4. Migration lors de la connexion** (1 jour)
```typescript
// hooks/useSupabase.ts
useEffect(() => {
  if (session?.user && !hasMigrated) {
    migrateGuestDataToDB(session.user.id);
  }
}, [session]);

async function migrateGuestDataToDB(userId: string) {
  // Migrer les parties
  const guestGames = await LocalStorage.getGames();
  if (guestGames.length > 0) {
    await supabase.from("games").insert(
      guestGames.map(g => ({ ...g, user_id: userId }))
    );
  }
  
  // Migrer les usernames
  const guestPlatforms = await LocalStorage.getPlatforms();
  if (guestPlatforms.length > 0) {
    await supabase.from("user_platforms").insert(
      guestPlatforms.map(p => ({ ...p, user_id: userId }))
    );
  }
  
  // Migrer les analyses et exercices...
  
  // Nettoyer le cache local
  await LocalStorage.clear();
}
```

**5. Modifier les policies RLS** (2-3h)
```sql
-- Permettre les requêtes anonymes pour certaines opérations
-- (Mais toujours protéger les données utilisateur)

-- Exemple : Pas de changement nécessaire si on utilise uniquement le cache local
-- Les policies restent strictes pour les utilisateurs authentifiés
```

**Complexité totale** : 🟡 **Moyenne** (4-5 jours)
**Risque** : 🟢 **Faible** (pas de changement DB majeur)

---

### Stratégie 2 : Mode Guest avec DB anonyme

**Principe** : Permettre l'utilisation sans compte mais stocker en DB avec un `user_id` anonyme/temporaire.

#### Avantages
- ✅ **Pas de limite de stockage** : DB Supabase au lieu d'AsyncStorage
- ✅ **Sync possible** : Si on utilise un identifiant unique (device ID)
- ✅ **Migration simple** : Changer le `user_id` lors de la connexion

#### Inconvénients
- ⚠️ **Complexité RLS** : Nécessite des policies spéciales pour les utilisateurs anonymes
- ⚠️ **Sécurité** : Risque de collision si plusieurs devices utilisent le même ID
- ⚠️ **Coût** : Utilisation de la DB même sans compte

#### Implémentation

**1. Créer un identifiant device unique**
```typescript
// utils/device-id.ts
import * as Crypto from 'expo-crypto';

let deviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (deviceId) return deviceId;
  
  // Récupérer ou créer un ID unique pour ce device
  const stored = await AsyncStorage.getItem('device_id');
  if (stored) {
    deviceId = stored;
    return deviceId;
  }
  
  // Créer un nouvel ID
  deviceId = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${Date.now()}-${Math.random()}`
  );
  
  await AsyncStorage.setItem('device_id', deviceId);
  return deviceId;
}
```

**2. Modifier les policies RLS**
```sql
-- Permettre les requêtes avec user_id anonyme
CREATE POLICY "Anonymous users can insert games" ON games
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    (auth.uid() IS NULL AND user_id LIKE 'guest_%')
  );

CREATE POLICY "Anonymous users can view own games" ON games
  FOR SELECT USING (
    auth.uid() = user_id OR 
    (auth.uid() IS NULL AND user_id LIKE 'guest_%')
  );
```

**3. Adapter les hooks**
```typescript
// hooks/useSyncGames.ts
const syncGames = useMutation({
  mutationFn: async ({ ... }) => {
    const userId = session?.user?.id || `guest_${await getDeviceId()}`;
    
    const gamesToInsert = await prepareGamesForInsert(
      platform,
      apiGames,
      userId, // Utiliser l'ID device si pas de session
    );
    
    // Insertion en DB avec user_id anonyme
    await supabase.from("games").insert(gamesToInsert);
  },
});
```

**4. Migration lors de la connexion**
```typescript
// Lors de la connexion, migrer les données
async function migrateGuestDataToUser(deviceId: string, userId: string) {
  // Mettre à jour toutes les tables avec le nouvel user_id
  await supabase
    .from("games")
    .update({ user_id: userId })
    .eq("user_id", `guest_${deviceId}`);
  
  // Faire de même pour analyses, exercices, user_platforms...
}
```

**Complexité totale** : 🟡 **Moyenne-Haute** (5-6 jours)
**Risque** : 🟡 **Moyen** (modifications RLS, risque de sécurité)

---

### Stratégie 3 : Mode Guest sans stockage (Lecture seule)

**Principe** : Permettre la consultation et l'analyse sans compte, mais pas de stockage.

#### Avantages
- ✅ **Très simple** : Pas de gestion de cache local
- ✅ **Pas de risque** : Pas de modification DB
- ✅ **Sécurité maximale** : RLS inchangé

#### Inconvénients
- ❌ **Pas de persistance** : Perte des données à la fermeture de l'app
- ❌ **Pas d'exercices** : Impossible de générer/stocker des exercices
- ❌ **Expérience limitée** : Pas de suivi de progression

#### Implémentation

**1. Modifier le routing** (1h)
```typescript
// Permettre l'accès même sans session
<Stack.Screen name="(protected)" />
```

**2. Adapter les hooks pour mode lecture seule** (2-3h)
```typescript
// hooks/useSyncGames.ts
const syncGames = useMutation({
  mutationFn: async ({ ... }) => {
    if (!session?.user) {
      // Mode guest : juste récupérer et afficher, pas de stockage
      const apiGames = await getUserGames(username, maxGames);
      return apiGames; // Retourner sans stocker
    }
    
    // Mode authentifié : stocker en DB
    // ... code existant
  },
});
```

**3. Désactiver les features nécessitant un compte**
```typescript
// Afficher un message "Connectez-vous pour sauvegarder" sur les boutons
{!session && (
  <TouchableOpacity onPress={() => router.push('/(public)/sign-in')}>
    <Text>Connectez-vous pour sauvegarder</Text>
  </TouchableOpacity>
)}
```

**Complexité totale** : 🟢 **Faible** (1 jour)
**Risque** : 🟢 **Très faible** (pas de changement majeur)

---

### Stratégie 4 : Onboarding progressif (Hybride)

**Principe** : Permettre l'utilisation immédiate, proposer la connexion au moment opportun.

#### Avantages
- ✅ **Meilleure UX** : L'utilisateur découvre la valeur avant de créer un compte
- ✅ **Taux de conversion** : Plus d'utilisateurs créent un compte après avoir testé
- ✅ **Flexibilité** : Combine les avantages des autres stratégies

#### Inconvénients
- ⚠️ **Complexité** : Nécessite une stratégie de cache (Stratégie 1 ou 2)
- ⚠️ **Gestion des prompts** : Quand proposer la connexion ?

#### Implémentation

**1. Utiliser la Stratégie 1 (cache local)**
- Permettre l'utilisation sans compte
- Stocker en cache local

**2. Ajouter des prompts contextuels**
```typescript
// Proposer la connexion après certaines actions
const shouldPromptSignUp = () => {
  // Après avoir synchronisé 5 parties
  if (guestGames.length >= 5 && !hasPromptedSignUp) {
    return true;
  }
  
  // Après avoir résolu 3 exercices
  if (guestExercisesCompleted >= 3 && !hasPromptedSignUp) {
    return true;
  }
  
  // Lors de la première tentative de sync sur un autre appareil
  if (tryingToSyncOnNewDevice) {
    return true;
  }
  
  return false;
};
```

**3. Modal de connexion contextuelle**
```typescript
// components/SignUpPrompt.tsx
{shouldPromptSignUp() && (
  <Modal>
    <Text>Créez un compte pour sauvegarder vos données</Text>
    <Button onPress={() => router.push('/(public)/sign-up')}>
      Créer un compte
    </Button>
    <Button onPress={dismissPrompt}>
      Plus tard
    </Button>
  </Modal>
)}
```

**Complexité totale** : 🟡 **Moyenne** (5-6 jours avec Stratégie 1)
**Risque** : 🟢 **Faible**

---

## 📊 Comparaison des stratégies

| Critère | Stratégie 1<br/>Cache Local | Stratégie 2<br/>DB Anonyme | Stratégie 3<br/>Lecture seule | Stratégie 4<br/>Onboarding |
|---------|---------------------------|---------------------------|------------------------------|---------------------------|
| **Complexité** | 🟡 Moyenne | 🟡 Moyenne-Haute | 🟢 Faible | 🟡 Moyenne |
| **Risque** | 🟢 Faible | 🟡 Moyen | 🟢 Très faible | 🟢 Faible |
| **Temps** | 4-5 jours | 5-6 jours | 1 jour | 5-6 jours |
| **Persistance** | ✅ Oui (local) | ✅ Oui (DB) | ❌ Non | ✅ Oui |
| **Sync multi-device** | ❌ Non | ⚠️ Partiel | ❌ Non | ⚠️ Avec compte |
| **Limite stockage** | ⚠️ AsyncStorage | ✅ DB | ❌ N/A | ⚠️ Selon mode |
| **Sécurité** | ✅ RLS intact | ⚠️ Policies modifiées | ✅ RLS intact | ✅ RLS intact |
| **UX** | ✅ Excellente | ✅ Excellente | ⚠️ Limitée | ✅ Excellente |

---

## 🎯 Recommandation

### **Stratégie 1 : Mode Guest avec cache local** (Recommandée)

**Pourquoi ?**
1. ✅ **Meilleur compromis** : Bonne UX sans compromettre la sécurité
2. ✅ **Migration simple** : Pas de modification RLS majeure
3. ✅ **Progressive enhancement** : Les features premium nécessitent un compte
4. ✅ **Risque faible** : Pas de changement DB critique

**Plan d'implémentation** :

**Phase 1 : Routing et structure** (1 jour)
- Modifier `app/_layout.tsx` pour permettre l'accès sans session
- Créer `utils/local-storage.ts` pour le cache local
- Adapter `hooks/useSupabase.ts` pour gérer le mode guest

**Phase 2 : Hooks adaptatifs** (2 jours)
- Adapter `useGames` : LocalStorage si guest, DB si auth
- Adapter `useSyncGames` : Stocker localement si guest
- Adapter `useChessPlatform` : Cache local pour usernames
- Adapter `useAnalyzeGame` : Stocker analyses localement si guest
- Adapter `useExercises` : Générer depuis cache local si guest

**Phase 3 : Migration** (1 jour)
- Créer fonction de migration `migrateGuestDataToDB`
- Déclencher automatiquement lors de la connexion
- Tester la migration avec données réelles

**Phase 4 : UI/UX** (1 jour)
- Ajouter indicateur "Mode guest" dans l'UI
- Prompts contextuels pour créer un compte
- Messages explicites sur les limitations du mode guest

**Total** : **4-5 jours de développement**

---

## ⚠️ Points d'attention

### 1. Limites AsyncStorage
- **Taille max** : ~6-10MB selon la plateforme
- **Solution** : Nettoyer les anciennes données, limiter le nombre de parties en cache
- **Alternative** : Utiliser `expo-file-system` pour plus d'espace

### 2. Performance
- **Lecture locale** : Plus rapide que DB
- **Écriture locale** : Peut être lente si beaucoup de données
- **Solution** : Debounce les écritures, utiliser des batch

### 3. Migration
- **Risque de doublons** : Si l'utilisateur sync avant de migrer
- **Solution** : Vérifier les doublons lors de la migration (basé sur `platform_game_id`)

### 4. Expiration des données
- **Problème** : Les données guest peuvent rester indéfiniment
- **Solution** : Ajouter une expiration (ex: 30 jours) et nettoyer automatiquement

---

## 🚀 Prochaines étapes

1. **Valider la stratégie** avec l'équipe
2. **Créer une branche** `feature/guest-mode`
3. **Implémenter Phase 1** (routing + structure)
4. **Tester** avec des données réelles
5. **Itérer** selon les retours

---

**Dernière mise à jour** : Analyse complète des dépendances et stratégies possibles
