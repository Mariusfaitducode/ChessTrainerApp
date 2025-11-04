# 🔍 Options pour l'analyse d'échecs

Comparaison des différentes approches pour intégrer un moteur d'analyse dans l'application.

---

## 1. Stockfish.js (Client-side) ⭐ **RECOMMANDÉ POUR DÉMARRER**

### Description

**Stockfish.js** est une version JavaScript de Stockfish (meilleur moteur d'échecs open-source) qui s'exécute dans le navigateur/mobile via Web Workers.

### Installation

```bash
npm install stockfish.js
# ou
npm install @mliebelt/pgn-parser stockfish-web  # Alternative
```

### Avantages ✅

- ✅ **Rapide à intégrer** : Bibliothèque JS simple
- ✅ **Gratuit** : Pas de coûts
- ✅ **Pas de dépendance serveur** : Analyse côté client
- ✅ **Données privées** : Aucune transmission réseau
- ✅ **Fonctionne offline** : Une fois chargé, pas besoin d'internet
- ✅ **Fonctionne sur mobile** : Compatible React Native via polyfills
- ✅ **Puissance suffisante** : Pour détecter blunders/mistakes (niveau ~2500-3000 ELO)

### Inconvénients ❌

- ❌ **Taille bundle** : ~500KB-1MB (augmente la taille de l'app)
- ❌ **CPU intensif** : Peut ralentir l'app sur anciens appareils
- ❌ **Limitations mémoire** : Sur mobile, moins performant qu'un serveur
- ⚠️ **Web Workers nécessaires** : Nécessite polyfill pour React Native
- ⚠️ **Depth limitée** : Sur mobile, depth max ~15-20 (vs 30+ sur serveur)

### Performance attendue

- **Analyse rapide** : 1-3 secondes par position (depth 15)
- **Analyse complète d'une partie** : 30-60 secondes pour 40 coups
- **Qualité** : Excellente pour détecter erreurs évidentes (blunders)

### Code exemple

```typescript
import { Stockfish } from "stockfish.js";

const engine = new Stockfish();
engine.onmessage = (line: string) => {
  if (line.startsWith("bestmove")) {
    // Parse best move
  }
  if (line.startsWith("info depth")) {
    // Parse evaluation
  }
};

engine.postMessage(
  "position fen rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
);
engine.postMessage("go depth 15");
```

### Compatibilité React Native

- ✅ Fonctionne avec **react-native-web** (web)
- ⚠️ Nécessite polyfill pour **mobile native** (Web Workers pas natifs)
- Alternative : **react-native-worker** ou **expo-worker**

### Coût

**0€** - Gratuit

---

## 2. Stockfish via Supabase Edge Function (Server-side) ⭐⭐ **MEILLEUR POUR PRODUCTION**

### Description

Exécuter Stockfish dans une **Supabase Edge Function** (Deno runtime) pour analyse côté serveur.

### Architecture

```
App → Supabase Edge Function → Stockfish binary → Résultat → DB
```

### Avantages ✅

- ✅ **Très puissant** : Serveur avec plus de ressources
- ✅ **Pas de bundle mobile** : Pas d'impact sur la taille de l'app
- ✅ **Depth élevée** : Depth 20-30 possible
- ✅ **Scalable** : Peut gérer plusieurs analyses simultanées
- ✅ **Fonctionne sur tous devices** : Pas de limitation mobile
- ✅ **Background processing** : Peut analyser en arrière-plan

### Inconvénients ❌

- ❌ **Setup plus complexe** : Nécessite Edge Function
- ❌ **Coût** : Utilisation des Edge Function (gratuit jusqu'à 2M invocations/mois)
- ❌ **Latence réseau** : Requête HTTP pour chaque position
- ❌ **Rate limiting** : Limites Supabase (mais généreuses)
- ⚠️ **Stockfish binary** : Nécessite compilation pour Deno

### Performance attendue

- **Analyse rapide** : 500ms-2s par position (depth 20-25)
- **Analyse complète** : 20-40 secondes pour 40 coups
- **Qualité** : Excellente, meilleure que client-side

### Code exemple (Edge Function)

```typescript
// supabase/functions/analyze-position/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { exec } from "https://deno.land/x/exec/mod.ts";

serve(async (req) => {
  const { fen, depth = 20 } = await req.json();

  // Exécuter Stockfish
  const process = exec(`stockfish`, {
    args: [`position fen ${fen}`, `go depth ${depth}`],
  });

  const output = await process.output();
  // Parse output...

  return new Response(JSON.stringify({ bestMove, evaluation }));
});
```

### Coût

- **Gratuit** : Jusqu'à 2M invocations/mois
- **Payant** : ~$0.0000001 par invocation après

---

## 3. Lichess Cloud Analysis API 🆓 **GRATUIT MAIS LIMITÉ**

### Description

API gratuite de Lichess pour analyser des positions. Accessible sans authentification.

### Endpoint

```
POST https://lichess.org/api/cloud-eval
{
  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "multiPv": 3,
  "depth": 20,
  "variant": "standard"
}
```

### Avantages ✅

- ✅ **100% gratuit** : Pas de limites de quota explicites
- ✅ **Très puissant** : Moteur Lichess (version Stockfish optimisée)
- ✅ **Pas de setup** : API REST simple
- ✅ **Pas de bundle** : Aucun code côté client
- ✅ **Depth élevée** : Depth 20-30 possible

### Inconvénients ❌

- ❌ **Rate limiting non documenté** : Risque de limitation
- ❌ **Pas officiel** : API non documentée publiquement
- ❌ **Latence réseau** : Requête HTTP par position
- ❌ **Dépendance externe** : Si Lichess tombe, l'app ne fonctionne plus
- ⚠️ **Non recommandé production** : Pas de garanties de disponibilité

### Performance attendue

- **Analyse rapide** : 500ms-2s par position (selon charge serveur)
- **Analyse complète** : 20-40 secondes pour 40 coups
- **Qualité** : Excellente (moteur Lichess)

### Code exemple

```typescript
const analyzePosition = async (fen: string) => {
  const response = await fetch("https://lichess.org/api/cloud-eval", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fen,
      multiPv: 3,
      depth: 20,
      variant: "standard",
    }),
  });

  const data = await response.json();
  return {
    bestMove: data.pvs[0].moves.split(" ")[0],
    evaluation: data.pvs[0].cp / 100, // centipawns to pawns
  };
};
```

### Coût

**0€** - Gratuit (mais risque de limitation non documentée)

---

## 4. Chess.com Cloud Analysis API ❓ **NON DISPONIBLE PUBLIQUEMENT**

### Description

Chess.com propose une analyse cloud, mais **pas d'API publique**.

### État

- ❌ **Pas d'API publique** : Réservé à l'interface web Chess.com
- ❌ **Pas de documentation** : Aucune voie d'accès documentée

### Verdict

**Non utilisable** pour notre cas.

---

## 5. Autres bibliothèques JavaScript

### 5.1 `chessops` + heuristiques simples

**Description** : Bibliothèque JavaScript pure sans moteur d'analyse.

**Problème** : ❌ Pas de moteur d'analyse, juste logique de jeu.

**Verdict** : ❌ **Inutilisable** pour notre cas.

### 5.2 `chess-web-api` (wrapper)

**Description** : Wrapper autour d'APIs tierces.

**Problème** : ❌ Dépend de services externes non garantis.

**Verdict** : ❌ **Non recommandé**.

---

## 📊 Comparaison rapide

| Critère         | Stockfish.js     | Edge Function     | Lichess API         |
| --------------- | ---------------- | ----------------- | ------------------- |
| **Setup**       | ⭐⭐⭐ Facile    | ⭐⭐ Moyen        | ⭐⭐⭐ Très facile  |
| **Coût**        | ⭐⭐⭐ Gratuit   | ⭐⭐ Gratuit\*    | ⭐⭐⭐ Gratuit      |
| **Performance** | ⭐⭐ Bon         | ⭐⭐⭐ Excellent  | ⭐⭐⭐ Excellent    |
| **Bundle size** | ⭐ Faible impact | ⭐⭐⭐ Aucun      | ⭐⭐⭐ Aucun        |
| **Scalabilité** | ⭐ Limité mobile | ⭐⭐⭐ Excellente | ⭐⭐ Bonne          |
| **Offline**     | ⭐⭐⭐ Oui       | ❌ Non            | ❌ Non              |
| **Privacité**   | ⭐⭐⭐ Parfaite  | ⭐⭐⭐ Parfaite   | ⭐ Données externes |
| **Fiabilité**   | ⭐⭐⭐ Parfaite  | ⭐⭐⭐ Parfaite   | ⭐ Non garantie     |

\*Jusqu'à 2M invocations/mois

---

## 🎯 Recommandation

### Phase 1 : Démarrage rapide (RECOMMANDÉ)

**👉 Stockfish.js côté client**

**Pourquoi** :

- ✅ Setup en 1-2 heures
- ✅ Pas de dépendance serveur
- ✅ Qualité suffisante pour MVP
- ✅ Gratuit et sans limites

**Quand passer à Edge Function** :

- Si besoin de meilleure qualité (depth > 20)
- Si trop de parties à analyser simultanément
- Si l'app ralentit sur mobile

### Phase 2 : Production optimisée

**👉 Stockfish via Edge Function**

**Pourquoi** :

- ✅ Meilleure qualité d'analyse
- ✅ Pas d'impact sur le bundle mobile
- ✅ Scalable
- ✅ Coût négligeable (gratuit jusqu'à 2M/mois)

### Phase 3 : Hybrid (si besoin)

**👉 Stockfish.js + Edge Function fallback**

**Pourquoi** :

- Analyse rapide côté client
- Fallback serveur si depth insuffisante
- Meilleure UX (analyse instantanée)

---

## 🚀 Plan d'implémentation suggéré

### Option A : Stockfish.js (MVP rapide)

1. **Installation**

   ```bash
   npm install stockfish.js
   ```

2. **Service d'analyse** (`services/chess/analyzer.ts`)
   - Wrapper autour de Stockfish.js
   - Fonction `analyzePosition(fen, depth)`
   - Fonction `analyzeGame(pgn)` qui analyse tous les coups
   - Classification erreurs (blunder/mistake/inaccuracy)

3. **Hook `useAnalyzeGame`**
   - Déclencher l'analyse
   - Progress tracking
   - Stockage dans `game_analyses`

4. **UI**
   - Bouton "Analyser" sur page détail
   - Progress bar pendant analyse
   - Affichage erreurs dans MoveList

**Temps estimé** : 3-5 jours

### Option B : Edge Function (Production)

1. **Setup Edge Function**
   - Créer function dans Supabase
   - Installer Stockfish binary (ou utiliser wasm)

2. **Service d'analyse** (`services/chess/analyzer.ts`)
   - Appels HTTP vers Edge Function
   - Batch requests pour optimiser

3. **Reste identique à Option A**

**Temps estimé** : 5-7 jours (avec setup)

---

## 📚 Ressources

### Stockfish.js

- **GitHub** : https://github.com/nmrugg/stockfish.js
- **NPM** : https://www.npmjs.com/package/stockfish.js
- **Documentation** : https://github.com/official-stockfish/Stockfish

### Supabase Edge Functions

- **Docs** : https://supabase.com/docs/guides/functions
- **Deno Runtime** : https://deno.land/

### Lichess Cloud API

- **Endpoint** : https://lichess.org/api/cloud-eval (non documenté)
- **Source** : Inspection réseau sur lichess.org

---

## 🎬 Prochaine étape

**Je recommande de commencer par Stockfish.js** pour :

1. Valider rapidement la fonctionnalité
2. Tester l'UX avec les utilisateurs
3. Évaluer les besoins réels (depth, qualité)
4. Migrer vers Edge Function si nécessaire

**Tu veux qu'on démarre avec Stockfish.js ou tu préfères directement l'Edge Function ?**



