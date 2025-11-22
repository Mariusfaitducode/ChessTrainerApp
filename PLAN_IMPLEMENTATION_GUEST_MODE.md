# Plan d'implémentation : Mode Guest avec Onboarding Progressif

## 📋 Vue d'ensemble

Implémentation de la **Stratégie 4** : Mode Guest avec cache local + prompts contextuels + migration automatique.

**Objectif** : Permettre l'utilisation sans compte, avec stockage local et migration transparente lors de la connexion.

---

## 🗂️ Structure des changements

### Fichiers à créer (nouveaux)

1. `utils/local-storage.ts` - Gestion du cache local
2. `utils/migration.ts` - Migration des données guest vers DB
3. `hooks/useGuestMode.ts` - Hook pour gérer le mode guest
4. `hooks/usePrompts.ts` - Hook pour gérer les prompts contextuels
5. `components/prompts/SignUpPrompt.tsx` - Composant modal de prompt
6. `components/prompts/GuestIndicator.tsx` - Indicateur mode guest
7. `types/guest.ts` - Types pour les données guest

### Fichiers à modifier (existants)

1. `app/_layout.tsx` - Routing (permettre accès sans session)
2. `hooks/useSupabase.ts` - Ajouter logique de migration
3. `hooks/useGames.ts` - Adapter pour mode guest
4. `hooks/useSyncGames.ts` - Adapter pour mode guest
5. `hooks/useChessPlatform.ts` - Adapter pour mode guest
6. `hooks/useAnalyzeGame.ts` - Adapter pour mode guest
7. `hooks/useExercises.ts` - Adapter pour mode guest
8. `hooks/useExercise.ts` - Adapter pour mode guest
9. `app/(protected)/(tabs)/games.tsx` - Ajouter prompts
10. `app/(protected)/(tabs)/exercises.tsx` - Ajouter prompts
11. `app/(protected)/(tabs)/profile.tsx` - Adapter pour mode guest
12. `app/(protected)/(tabs)/index.tsx` - Adapter pour mode guest
13. `utils/exercise.ts` - Adapter pour mode guest

---

## 📝 Détail des changements par fichier

### 1. NOUVEAU : `utils/local-storage.ts`

**Objectif** : Gérer le stockage local des données en mode guest.

```typescript
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Game, GameAnalysis, Exercise } from "@/types/database";
import type { Platform } from "@/types/chess";

const STORAGE_KEYS = {
  GAMES: "guest_games",
  PLATFORMS: "guest_platforms",
  ANALYSES: "guest_analyses_", // + gameId
  EXERCISES: "guest_exercises",
  MIGRATION_FLAG: "guest_migration_completed",
} as const;

export const LocalStorage = {
  // Games
  async saveGames(games: Game[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(games));
  },

  async getGames(): Promise<Game[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.GAMES);
    return data ? JSON.parse(data) : [];
  },

  async addGame(game: Game): Promise<void> {
    const games = await this.getGames();
    games.push(game);
    await this.saveGames(games);
  },

  async removeGame(gameId: string): Promise<void> {
    const games = await this.getGames();
    const filtered = games.filter((g) => g.id !== gameId);
    await this.saveGames(filtered);
  },

  // Platforms
  async savePlatforms(
    platforms: { platform: Platform; username: string }[]
  ): Promise<void> {
    await AsyncStorage.setItem(
      STORAGE_KEYS.PLATFORMS,
      JSON.stringify(platforms)
    );
  },

  async getPlatforms(): Promise<
    { platform: Platform; username: string }[]
  > {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PLATFORMS);
    return data ? JSON.parse(data) : [];
  },

  async addPlatform(
    platform: Platform,
    username: string
  ): Promise<void> {
    const platforms = await this.getPlatforms();
    const existing = platforms.find((p) => p.platform === platform);
    if (existing) {
      existing.username = username;
    } else {
      platforms.push({ platform, username });
    }
    await this.savePlatforms(platforms);
  },

  // Analyses
  async saveAnalyses(
    gameId: string,
    analyses: GameAnalysis[]
  ): Promise<void> {
    const key = `${STORAGE_KEYS.ANALYSES}${gameId}`;
    await AsyncStorage.setItem(key, JSON.stringify(analyses));
  },

  async getAnalyses(gameId: string): Promise<GameAnalysis[]> {
    const key = `${STORAGE_KEYS.ANALYSES}${gameId}`;
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  },

  // Exercises
  async saveExercises(exercises: Exercise[]): Promise<void> {
    await AsyncStorage.setItem(
      STORAGE_KEYS.EXERCISES,
      JSON.stringify(exercises)
    );
  },

  async getExercises(): Promise<Exercise[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.EXERCISES);
    return data ? JSON.parse(data) : [];
  },

  async addExercise(exercise: Exercise): Promise<void> {
    const exercises = await this.getExercises();
    exercises.push(exercise);
    await this.saveExercises(exercises);
  },

  async updateExercise(
    exerciseId: string,
    updates: Partial<Exercise>
  ): Promise<void> {
    const exercises = await this.getExercises();
    const index = exercises.findIndex((e) => e.id === exerciseId);
    if (index !== -1) {
      exercises[index] = { ...exercises[index], ...updates };
      await this.saveExercises(exercises);
    }
  },

  // Migration
  async setMigrationCompleted(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.MIGRATION_FLAG, "true");
  },

  async isMigrationCompleted(): Promise<boolean> {
    const flag = await AsyncStorage.getItem(STORAGE_KEYS.MIGRATION_FLAG);
    return flag === "true";
  },

  // Clear all guest data
  async clearAll(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const guestKeys = keys.filter((key) =>
      Object.values(STORAGE_KEYS).some((storageKey) =>
        key.startsWith(storageKey)
      )
    );
    await AsyncStorage.multiRemove(guestKeys);
  },
};
```

**Complexité** : 🟢 Faible (2-3h)

---

### 2. NOUVEAU : `utils/migration.ts`

**Objectif** : Migrer les données guest vers la DB lors de la connexion.

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import { LocalStorage } from "./local-storage";
import type { Game, GameAnalysis, Exercise } from "@/types/database";
import type { Platform } from "@/types/chess";

export async function migrateGuestDataToDB(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  console.log("[Migration] Début migration des données guest...");

  // 1. Migrer les plateformes
  const guestPlatforms = await LocalStorage.getPlatforms();
  if (guestPlatforms.length > 0) {
    console.log(`[Migration] Migration de ${guestPlatforms.length} plateformes...`);
    for (const platform of guestPlatforms) {
      // Vérifier si existe déjà
      const { data: existing } = await supabase
        .from("user_platforms")
        .select("*")
        .eq("user_id", userId)
        .eq("platform", platform.platform)
        .maybeSingle();

      if (existing) {
        // Mettre à jour
        await supabase
          .from("user_platforms")
          .update({ platform_username: platform.username })
          .eq("id", existing.id);
      } else {
        // Créer
        await supabase.from("user_platforms").insert({
          user_id: userId,
          platform: platform.platform,
          platform_username: platform.username,
        });
      }
    }
  }

  // 2. Migrer les parties
  const guestGames = await LocalStorage.getGames();
  if (guestGames.length > 0) {
    console.log(`[Migration] Migration de ${guestGames.length} parties...`);
    
    // Vérifier les doublons
    const platformGameIds = guestGames.map((g) => ({
      platform: g.platform,
      platform_game_id: g.platform_game_id,
    }));

    const { data: existingGames } = await supabase
      .from("games")
      .select("platform, platform_game_id")
      .eq("user_id", userId)
      .in(
        "platform",
        platformGameIds.map((g) => g.platform)
      );

    const existingSet = new Set(
      (existingGames || []).map(
        (g) => `${g.platform}_${g.platform_game_id}`
      )
    );

    const gamesToInsert = guestGames
      .filter(
        (g) =>
          !existingSet.has(`${g.platform}_${g.platform_game_id}`)
      )
      .map((g) => ({
        ...g,
        user_id: userId,
        id: undefined, // Laisser DB générer un nouvel ID
      }));

    if (gamesToInsert.length > 0) {
      const { data: insertedGames, error } = await supabase
        .from("games")
        .insert(gamesToInsert)
        .select();

      if (error) {
        console.error("[Migration] Erreur insertion parties:", error);
      } else {
        console.log(
          `[Migration] ${insertedGames?.length || 0} parties migrées`
        );

        // 3. Migrer les analyses pour chaque partie migrée
        if (insertedGames) {
          for (const insertedGame of insertedGames) {
            // Trouver la partie guest correspondante
            const guestGame = guestGames.find(
              (g) =>
                g.platform === insertedGame.platform &&
                g.platform_game_id === insertedGame.platform_game_id
            );

            if (guestGame) {
              const guestAnalyses = await LocalStorage.getAnalyses(
                guestGame.id
              );

              if (guestAnalyses.length > 0) {
                const analysesToInsert = guestAnalyses.map((a) => ({
                  ...a,
                  game_id: insertedGame.id,
                  id: undefined,
                }));

                await supabase
                  .from("game_analyses")
                  .insert(analysesToInsert);

                console.log(
                  `[Migration] ${analysesToInsert.length} analyses migrées pour partie ${insertedGame.id}`
                );
              }
            }
          }
        }
      }
    }
  }

  // 4. Migrer les exercices
  const guestExercises = await LocalStorage.getExercises();
  if (guestExercises.length > 0) {
    console.log(`[Migration] Migration de ${guestExercises.length} exercices...`);

    // Les exercices ont des références à game_id et game_analysis_id
    // Il faut les mapper vers les nouveaux IDs après migration des parties
    // Pour simplifier, on peut régénérer les exercices depuis les analyses migrées
    // ou mapper les IDs si on a gardé une correspondance

    // TODO: Implémenter le mapping des IDs
    // Pour l'instant, on peut régénérer les exercices depuis les analyses
  }

  // 5. Marquer la migration comme complétée
  await LocalStorage.setMigrationCompleted();

  // 6. Nettoyer le cache local
  await LocalStorage.clearAll();

  console.log("[Migration] Migration terminée !");
}
```

**Complexité** : 🟡 Moyenne (3-4h)

---

### 3. NOUVEAU : `hooks/useGuestMode.ts`

**Objectif** : Hook pour gérer l'état du mode guest.

```typescript
import { useMemo } from "react";
import { useSupabase } from "./useSupabase";

export const useGuestMode = () => {
  const { session } = useSupabase();

  const isGuest = useMemo(() => !session?.user, [session]);

  return {
    isGuest,
    isAuthenticated: !isGuest,
  };
};
```

**Complexité** : 🟢 Très faible (30 min)

---

### 4. NOUVEAU : `hooks/usePrompts.ts`

**Objectif** : Gérer les prompts contextuels pour créer un compte.

```typescript
import { useState, useEffect } from "react";
import { useGuestMode } from "./useGuestMode";
import { useGames } from "./useGames";
import { useExercises } from "./useExercises";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PROMPT_KEYS = {
  SYNC_PROMPT: "prompt_sync_shown",
  EXERCISE_PROMPT: "prompt_exercise_shown",
} as const;

const THRESHOLDS = {
  GAMES_FOR_SYNC_PROMPT: 5,
  EXERCISES_FOR_PROMPT: 3,
} as const;

export const usePrompts = () => {
  const { isGuest } = useGuestMode();
  const { games } = useGames();
  const { exercises } = useExercises(false); // Non complétés

  const [showSyncPrompt, setShowSyncPrompt] = useState(false);
  const [showExercisePrompt, setShowExercisePrompt] = useState(false);

  useEffect(() => {
    if (!isGuest) return;

    // Prompt après synchronisation de parties
    const checkSyncPrompt = async () => {
      const hasShown = await AsyncStorage.getItem(PROMPT_KEYS.SYNC_PROMPT);
      if (!hasShown && games.length >= THRESHOLDS.GAMES_FOR_SYNC_PROMPT) {
        setShowSyncPrompt(true);
        await AsyncStorage.setItem(PROMPT_KEYS.SYNC_PROMPT, "true");
      }
    };

    // Prompt après résolution d'exercices
    const checkExercisePrompt = async () => {
      const hasShown = await AsyncStorage.getItem(PROMPT_KEYS.EXERCISE_PROMPT);
      const completedExercises = exercises.filter((e) => e.completed);
      if (
        !hasShown &&
        completedExercises.length >= THRESHOLDS.EXERCISES_FOR_PROMPT
      ) {
        setShowExercisePrompt(true);
        await AsyncStorage.setItem(PROMPT_KEYS.EXERCISE_PROMPT, "true");
      }
    };

    checkSyncPrompt();
    checkExercisePrompt();
  }, [isGuest, games.length, exercises.length]);

  return {
    showSyncPrompt,
    showExercisePrompt,
    dismissSyncPrompt: () => setShowSyncPrompt(false),
    dismissExercisePrompt: () => setShowExercisePrompt(false),
  };
};
```

**Complexité** : 🟢 Faible (1-2h)

---

### 5. NOUVEAU : `components/prompts/SignUpPrompt.tsx`

**Objectif** : Composant modal pour les prompts de création de compte.

```typescript
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing, typography, borders, shadows } from "@/theme";

interface SignUpPromptProps {
  visible: boolean;
  onDismiss: () => void;
  type: "sync" | "exercise";
  count: number;
}

export const SignUpPrompt: React.FC<SignUpPromptProps> = ({
  visible,
  onDismiss,
  type,
  count,
}) => {
  const router = useRouter();

  const config = {
    sync: {
      emoji: "💾",
      title: `Vous avez synchronisé ${count} parties !`,
      message:
        "Créez un compte pour les sauvegarder définitivement et les synchroniser entre vos appareils.",
    },
    exercise: {
      emoji: "📊",
      title: `Vous avez résolu ${count} exercices !`,
      message:
        "Créez un compte pour suivre votre progression et accéder à vos statistiques détaillées.",
    },
  };

  const { emoji, title, message } = config[type];

  const handleSignUp = () => {
    onDismiss();
    router.push("/(public)/sign-up");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={onDismiss}
            >
              <Text style={styles.secondaryButtonText}>Plus tard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleSignUp}
            >
              <Text style={styles.primaryButtonText}>Créer un compte</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing[4],
  },
  container: {
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.xl,
    padding: spacing[6],
    width: "100%",
    maxWidth: 400,
    ...shadows.lg,
  },
  emoji: {
    fontSize: 64,
    textAlign: "center",
    marginBottom: spacing[4],
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: spacing[3],
  },
  message: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing[6],
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
  },
  buttons: {
    flexDirection: "row",
    gap: spacing[3],
  },
  button: {
    flex: 1,
    padding: spacing[4],
    borderRadius: borders.radius.md,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: colors.orange[500],
  },
  primaryButtonText: {
    color: colors.text.inverse,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  secondaryButton: {
    backgroundColor: colors.background.tertiary,
  },
  secondaryButtonText: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});
```

**Complexité** : 🟢 Faible (1h)

---

### 6. NOUVEAU : `components/prompts/GuestIndicator.tsx`

**Objectif** : Indicateur discret du mode guest.

```typescript
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useGuestMode } from "@/hooks/useGuestMode";
import { colors, spacing, typography, borders } from "@/theme";

export const GuestIndicator: React.FC = () => {
  const { isGuest } = useGuestMode();
  const router = useRouter();

  if (!isGuest) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Mode invité</Text>
      <TouchableOpacity
        onPress={() => router.push("/(public)/sign-up")}
        style={styles.link}
      >
        <Text style={styles.linkText}>Créer un compte</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.md,
  },
  text: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  link: {},
  linkText: {
    fontSize: typography.fontSize.xs,
    color: colors.orange[500],
    fontWeight: typography.fontWeight.semibold,
  },
});
```

**Complexité** : 🟢 Très faible (30 min)

---

### 7. MODIFIER : `app/_layout.tsx`

**Changement** : Permettre l'accès à `(protected)` même sans session.

```typescript
function RootNavigator() {
  const { isLoaded, session } = useSupabase();

  useEffect(() => {
    if (isLoaded) {
      SplashScreen.hide();
    }
  }, [isLoaded]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animation: "none",
        animationDuration: 0,
      }}
    >
      {/* Toujours accessible, même sans session */}
      <Stack.Screen name="(protected)" />

      {/* Seulement si pas de session */}
      {!session && <Stack.Screen name="(public)" />}
    </Stack>
  );
}
```

**Complexité** : 🟢 Très faible (15 min)

---

### 8. MODIFIER : `hooks/useSupabase.ts`

**Changement** : Ajouter la logique de migration lors de la connexion.

```typescript
import { useContext, useEffect, useState, useRef } from "react";
import { SupabaseClient, Session } from "@supabase/supabase-js";
import { SupabaseContext } from "@/context/supabase-context";
import { migrateGuestDataToDB } from "@/utils/migration";
import { LocalStorage } from "@/utils/local-storage";

interface UseSupabaseProps {
  isLoaded: boolean;
  session: Session | null | undefined;
  supabase: SupabaseClient;
  signOut: () => Promise<void>;
}

export const useSupabase = (): UseSupabaseProps => {
  const supabase = useContext(SupabaseContext);
  const [isLoaded, setIsLoaded] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const migrationDoneRef = useRef(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoaded(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        
        // Migration automatique lors de la connexion
        if (newSession?.user && !migrationDoneRef.current) {
          const hasMigrated = await LocalStorage.isMigrationCompleted();
          if (!hasMigrated) {
            try {
              await migrateGuestDataToDB(supabase, newSession.user.id);
              migrationDoneRef.current = true;
            } catch (error) {
              console.error("[useSupabase] Erreur migration:", error);
            }
          }
        }
      },
    );
    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    migrationDoneRef.current = false; // Reset pour prochaine connexion
  };

  if (!supabase) {
    throw new Error("useSupabase must be used within a SupabaseProvider");
  }

  return { isLoaded, session, supabase, signOut };
};
```

**Complexité** : 🟡 Moyenne (1-2h)

---

### 9. MODIFIER : `hooks/useGames.ts`

**Changement** : Adapter pour utiliser LocalStorage en mode guest.

```typescript
import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "./useSupabase";
import { useGuestMode } from "./useGuestMode";
import { LocalStorage } from "@/utils/local-storage";
import type { Game } from "@/types/games";

export const useGames = () => {
  const { supabase } = useSupabase();
  const { isGuest } = useGuestMode();

  const {
    data: games,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["games", isGuest ? "guest" : "authenticated"],
    queryFn: async () => {
      if (isGuest) {
        // Mode guest : utiliser LocalStorage
        return await LocalStorage.getGames();
      } else {
        // Mode authentifié : utiliser Supabase (code existant)
        const { data: gamesData, error: gamesError } = await supabase
          .from("games")
          .select("*")
          .order("played_at", { ascending: false });

        if (gamesError) throw gamesError;

        if (!gamesData || gamesData.length === 0) {
          return [];
        }

        // ... reste du code existant pour analyses et blunders_count ...
        
        return gamesWithCorrectStatus as Game[];
      }
    },
  });

  return {
    games: games ?? [],
    isLoading,
    error,
    refetch,
  };
};
```

**Complexité** : 🟡 Moyenne (2h)

---

### 10. MODIFIER : `hooks/useSyncGames.ts`

**Changement** : Adapter pour stocker localement en mode guest.

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { useSupabase } from "./useSupabase";
import { useChessPlatform } from "./useChessPlatform";
import { useGuestMode } from "./useGuestMode";
import { LocalStorage } from "@/utils/local-storage";
import { v4 as uuidv4 } from "uuid"; // ou autre générateur d'ID
// ... autres imports

export const useSyncGames = () => {
  const { supabase, session } = useSupabase();
  const { platforms } = useChessPlatform();
  const { isGuest } = useGuestMode();
  const queryClient = useQueryClient();

  const syncGames = useMutation({
    mutationFn: async ({
      maxGames = 50,
      platform,
    }: {
      maxGames?: number;
      platform?: Platform;
    } = {}) => {
      // En mode guest, on peut utiliser les plateformes du cache local
      const platformsToSync = platform
        ? platforms.filter((p) => p.platform === platform)
        : platforms;

      if (platformsToSync.length === 0) {
        throw new Error(
          "Aucun username configuré. Ajoute un username dans l'onglet Profil."
        );
      }

      let totalImported = 0;
      let totalSkipped = 0;
      let totalErrors = 0;

      for (const userPlatform of platformsToSync) {
        try {
          // ... récupération des parties depuis API (code existant) ...

          // Convertir les parties
          const gamesToInsert = await prepareGamesForInsert(
            userPlatform.platform,
            apiGames,
            isGuest ? "guest" : session!.user.id, // user_id temporaire pour guest
          );

          if (isGuest) {
            // Mode guest : stocker localement
            const existingGames = await LocalStorage.getGames();
            const existingIds = new Set(
              existingGames.map((g) => `${g.platform}_${g.platform_game_id}`)
            );

            const newGames = gamesToInsert
              .filter(
                (g) =>
                  !existingIds.has(`${g.platform}_${g.platform_game_id}`)
              )
              .map((g) => ({
                ...g,
                id: uuidv4(), // Générer un ID temporaire
                user_id: "guest", // ID temporaire
              }));

            for (const game of newGames) {
              await LocalStorage.addGame(game as Game);
            }

            totalImported = newGames.length;
            totalSkipped = gamesToInsert.length - newGames.length;
          } else {
            // Mode authentifié : code existant
            // ... vérification doublons et insertion DB ...
          }
        } catch (error: any) {
          // ... gestion erreurs ...
        }
      }

      return {
        imported: totalImported,
        skipped: totalSkipped,
        errors: totalErrors,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["games"] });
      // ... messages de succès ...
    },
    // ... gestion erreurs ...
  });

  return {
    syncGames: syncGames.mutateAsync,
    isSyncing: syncGames.isPending,
  };
};
```

**Complexité** : 🟡 Moyenne (3-4h)

---

### 11. MODIFIER : `hooks/useChessPlatform.ts`

**Changement** : Adapter pour utiliser LocalStorage en mode guest.

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "./useSupabase";
import { useGuestMode } from "./useGuestMode";
import { LocalStorage } from "@/utils/local-storage";
// ... autres imports

export const useChessPlatform = () => {
  const { supabase, session } = useSupabase();
  const { isGuest } = useGuestMode();
  const queryClient = useQueryClient();

  const {
    data: platforms,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["user-platforms", isGuest ? "guest" : "authenticated"],
    queryFn: async () => {
      if (isGuest) {
        // Mode guest : utiliser LocalStorage
        const guestPlatforms = await LocalStorage.getPlatforms();
        return guestPlatforms.map((p) => ({
          id: `guest_${p.platform}`, // ID temporaire
          user_id: "guest",
          platform: p.platform,
          platform_username: p.username,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })) as UserPlatform[];
      } else {
        // Mode authentifié : code existant
        if (!session?.user) return [];
        const { data, error } = await supabase
          .from("user_platforms")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data as UserPlatform[];
      }
    },
    enabled: isGuest || !!session?.user,
  });

  const addPlatform = useMutation({
    mutationFn: async ({
      platform,
      username,
    }: {
      platform: Platform;
      username: string;
    }) => {
      // Valider username (code existant)
      // ...

      if (isGuest) {
        // Mode guest : stocker localement
        await LocalStorage.addPlatform(platform, username);
        return {
          id: `guest_${platform}`,
          user_id: "guest",
          platform,
          platform_username: username,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as UserPlatform;
      } else {
        // Mode authentifié : code existant
        // ...
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-platforms"] });
    },
  });

  // ... reste du code ...
};
```

**Complexité** : 🟡 Moyenne (2-3h)

---

### 12. MODIFIER : `hooks/useAnalyzeGame.ts`

**Changement** : Adapter pour stocker les analyses localement en mode guest.

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { useSupabase } from "./useSupabase";
import { useGuestMode } from "./useGuestMode";
import { LocalStorage } from "@/utils/local-storage";
// ... autres imports

export const useAnalyzeGame = () => {
  const { supabase, session } = useSupabase();
  const queryClient = useQueryClient();
  const { platforms } = useChessPlatform();
  const { isGuest } = useGuestMode();

  const analyze = useMutation({
    mutationFn: async ({
      game,
      options = {},
    }: {
      game: Game;
      options?: AnalyzeGameOptions;
    }) => {
      if (!game.pgn) {
        throw new Error("PGN manquant pour cette partie");
      }

      const analyses = await analyzeGame(game.pgn, {
        depth: options.depth ?? 13,
        onProgress: options.onProgress,
      });

      if (analyses.length === 0) {
        throw new Error("Aucune analyse générée");
      }

      if (isGuest) {
        // Mode guest : stocker localement
        const analysesToInsert = prepareAnalysesForInsert(game.id, analyses);
        await LocalStorage.saveAnalyses(game.id, analysesToInsert);

        // Générer les exercices localement
        // TODO: Adapter generateExercisesForGame pour mode guest
      } else {
        // Mode authentifié : code existant
        const analysesToInsert = prepareAnalysesForInsert(game.id, analyses);
        await insertAnalyses(supabase, game.id, analysesToInsert);

        setTimeout(() => {
          generateExercisesForGame(
            supabase,
            game.id,
            game,
            platforms,
            queryClient,
            "useAnalyzeGame",
          );
        }, 100);
      }

      // Invalider les caches
      queryClient.invalidateQueries({ queryKey: ["game-analyses", game.id] });
      queryClient.invalidateQueries({ queryKey: ["games"] });
      queryClient.invalidateQueries({ queryKey: ["game-metadata", game.id] });

      return analyses;
    },
    // ... gestion erreurs ...
  });

  return {
    analyze: analyze.mutateAsync,
    isAnalyzing: analyze.isPending,
    error: analyze.error,
  };
};
```

**Complexité** : 🟡 Moyenne (2-3h)

---

### 13. MODIFIER : `hooks/useExercises.ts`

**Changement** : Adapter pour utiliser LocalStorage en mode guest.

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "./useSupabase";
import { useChessPlatform } from "./useChessPlatform";
import { useGuestMode } from "./useGuestMode";
import { LocalStorage } from "@/utils/local-storage";
// ... autres imports

export const useExercises = (completed?: boolean) => {
  const { supabase } = useSupabase();
  const { platforms } = useChessPlatform();
  const { isGuest } = useGuestMode();
  const queryClient = useQueryClient();

  const {
    data: exercises,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["exercises", completed, platforms, isGuest ? "guest" : "authenticated"],
    queryFn: async () => {
      if (isGuest) {
        // Mode guest : utiliser LocalStorage
        let guestExercises = await LocalStorage.getExercises();
        
        if (completed !== undefined) {
          guestExercises = guestExercises.filter(
            (e) => e.completed === completed
          );
        }

        // Enrichir avec les données de games et analyses depuis le cache
        // TODO: Implémenter l'enrichissement pour mode guest
        return guestExercises;
      } else {
        // Mode authentifié : code existant
        // ...
      }
    },
  });

  const updateExercise = useMutation({
    mutationFn: async ({
      exerciseId,
      updates,
    }: {
      exerciseId: string;
      updates: Partial<Exercise>;
    }) => {
      if (isGuest) {
        await LocalStorage.updateExercise(exerciseId, updates);
        return updates as Exercise;
      } else {
        // Mode authentifié : code existant
        // ...
      }
    },
    // ...
  });

  // ... reste du code ...
};
```

**Complexité** : 🟡 Moyenne (2-3h)

---

### 14. MODIFIER : `app/(protected)/(tabs)/games.tsx`

**Changement** : Ajouter les prompts et l'indicateur guest.

```typescript
import { usePrompts } from "@/hooks/usePrompts";
import { GuestIndicator } from "@/components/prompts/GuestIndicator";
import { SignUpPrompt } from "@/components/prompts/SignUpPrompt";

export default function GamesScreen() {
  // ... code existant ...
  const { showSyncPrompt, dismissSyncPrompt } = usePrompts();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Indicateur guest */}
      <GuestIndicator />

      {/* ... reste du code existant ... */}

      {/* Prompt de création de compte */}
      <SignUpPrompt
        visible={showSyncPrompt}
        onDismiss={dismissSyncPrompt}
        type="sync"
        count={games.length}
      />
    </View>
  );
}
```

**Complexité** : 🟢 Faible (30 min)

---

### 15. MODIFIER : `app/(protected)/(tabs)/exercises.tsx`

**Changement** : Ajouter les prompts.

```typescript
import { usePrompts } from "@/hooks/usePrompts";
import { SignUpPrompt } from "@/components/prompts/SignUpPrompt";

export default function ExercisesScreen() {
  // ... code existant ...
  const { showExercisePrompt, dismissExercisePrompt } = usePrompts();
  const completedExercises = exercises.filter((e) => e.completed);

  return (
    <View>
      {/* ... code existant ... */}

      <SignUpPrompt
        visible={showExercisePrompt}
        onDismiss={dismissExercisePrompt}
        type="exercise"
        count={completedExercises.length}
      />
    </View>
  );
}
```

**Complexité** : 🟢 Faible (30 min)

---

### 16. MODIFIER : `app/(protected)/(tabs)/profile.tsx`

**Changement** : Adapter pour mode guest (masquer certaines sections).

```typescript
import { useGuestMode } from "@/hooks/useGuestMode";

export default function ProfileScreen() {
  const { isGuest } = useGuestMode();
  // ... code existant ...

  return (
    <ScrollView>
      {!isGuest && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compte</Text>
          {/* ... section compte ... */}
        </View>
      )}

      {/* ... reste du code ... */}

      {!isGuest && (
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Déconnexion</Text>
          </TouchableOpacity>
        </View>
      )}

      {isGuest && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.signUpButton}
            onPress={() => router.push("/(public)/sign-up")}
          >
            <Text style={styles.signUpText}>Créer un compte</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}
```

**Complexité** : 🟢 Faible (1h)

---

## 📊 Résumé des changements

### Fichiers à créer : 7
1. `utils/local-storage.ts` (2-3h)
2. `utils/migration.ts` (3-4h)
3. `hooks/useGuestMode.ts` (30 min)
4. `hooks/usePrompts.ts` (1-2h)
5. `components/prompts/SignUpPrompt.tsx` (1h)
6. `components/prompts/GuestIndicator.tsx` (30 min)
7. `types/guest.ts` (30 min)

### Fichiers à modifier : 9
1. `app/_layout.tsx` (15 min)
2. `hooks/useSupabase.ts` (1-2h)
3. `hooks/useGames.ts` (2h)
4. `hooks/useSyncGames.ts` (3-4h)
5. `hooks/useChessPlatform.ts` (2-3h)
6. `hooks/useAnalyzeGame.ts` (2-3h)
7. `hooks/useExercises.ts` (2-3h)
8. `app/(protected)/(tabs)/games.tsx` (30 min)
9. `app/(protected)/(tabs)/exercises.tsx` (30 min)
10. `app/(protected)/(tabs)/profile.tsx` (1h)

**Total estimé** : **20-30 heures** (4-5 jours de développement)

---

## 🎯 Ordre d'implémentation recommandé

### Phase 1 : Infrastructure (Jour 1)
1. ✅ Créer `utils/local-storage.ts`
2. ✅ Créer `hooks/useGuestMode.ts`
3. ✅ Créer `types/guest.ts`
4. ✅ Modifier `app/_layout.tsx`

### Phase 2 : Hooks de base (Jour 2)
1. ✅ Modifier `hooks/useChessPlatform.ts`
2. ✅ Modifier `hooks/useGames.ts`
3. ✅ Modifier `hooks/useSyncGames.ts`

### Phase 3 : Features avancées (Jour 3)
1. ✅ Modifier `hooks/useAnalyzeGame.ts`
2. ✅ Modifier `hooks/useExercises.ts`
3. ✅ Adapter `utils/exercise.ts` pour mode guest

### Phase 4 : Migration (Jour 4)
1. ✅ Créer `utils/migration.ts`
2. ✅ Modifier `hooks/useSupabase.ts`

### Phase 5 : UI et prompts (Jour 5)
1. ✅ Créer `hooks/usePrompts.ts`
2. ✅ Créer `components/prompts/SignUpPrompt.tsx`
3. ✅ Créer `components/prompts/GuestIndicator.tsx`
4. ✅ Modifier les écrans pour ajouter les prompts

---

## ⚠️ Points d'attention

### 1. Génération d'IDs temporaires
- En mode guest, on doit générer des IDs temporaires (UUID)
- À la migration, ces IDs sont remplacés par les IDs de la DB
- **Solution** : Utiliser `uuid` ou `expo-crypto`

### 2. Mapping des IDs lors de la migration
- Les exercices référencent `game_id` et `game_analysis_id`
- Il faut mapper les anciens IDs vers les nouveaux
- **Solution** : Créer un mapping lors de la migration

### 3. Enrichissement des exercices en mode guest
- `useExercises` enrichit avec des données de games/analyses
- En mode guest, il faut récupérer depuis le cache local
- **Solution** : Adapter `enrichExercise` pour mode guest

### 4. Limite AsyncStorage
- ~6-10MB selon la plateforme
- **Solution** : Nettoyer les anciennes données, limiter le nombre de parties

### 5. Performance
- Les opérations AsyncStorage sont synchrones
- **Solution** : Debounce les écritures, utiliser des batch

---

## 🧪 Tests à effectuer

1. **Mode guest** :
   - ✅ Ajouter un username
   - ✅ Synchroniser des parties
   - ✅ Analyser une partie
   - ✅ Résoudre des exercices

2. **Migration** :
   - ✅ Créer un compte avec des données guest
   - ✅ Vérifier que toutes les données sont migrées
   - ✅ Vérifier qu'il n'y a pas de doublons

3. **Prompts** :
   - ✅ Prompt après 5 parties synchronisées
   - ✅ Prompt après 3 exercices résolus
   - ✅ Dismiss des prompts

4. **UI** :
   - ✅ Indicateur guest visible
   - ✅ Sections masquées en mode guest
   - ✅ Boutons de création de compte

---

**Dernière mise à jour** : Plan d'implémentation complet et détaillé
