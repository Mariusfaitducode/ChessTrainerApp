# 🚀 Guide Déploiement Fly.io

Guide complet pour déployer le backend Docker sur Fly.io.

---

## ✅ Prérequis

- [x] Docker fonctionne en local
- [x] Compte GitHub (pour le repo)
- [x] Backend testé et fonctionnel

---

## 🚀 Étape 1 : Installer Fly CLI

```bash
# macOS
brew install flyctl

# Ou avec curl
curl -L https://fly.io/install.sh | sh

# Vérifier l'installation
flyctl version
```

---

## 🚀 Étape 2 : Se connecter

```bash
flyctl auth login
```

Cela ouvrira ton navigateur pour te connecter. Crée un compte si nécessaire (gratuit).

---

## 🚀 Étape 3 : Créer l'app Fly.io

Dans le dossier `backend/` :

```bash
cd backend
flyctl launch
```

Fly.io va :
1. Détecter le Dockerfile automatiquement
2. Te demander un nom d'app (ou en générer un)
3. Te demander une région (choisir la plus proche, ex: `cdg` pour Paris)
4. Créer un `fly.toml` avec la configuration

**Réponses recommandées** :
- **App name** : `chess-correct-backend` (ou laisse Fly.io générer)
- **Region** : `cdg` (Paris) ou `iad` (Washington) ou `lhr` (Londres)
- **Postgres** : Non (on n'en a pas besoin)
- **Redis** : Non

---

## ⚙️ Étape 4 : Configurer fly.toml

Fly.io a créé un `fly.toml`. Vérifie qu'il ressemble à ça :

```toml
app = "ton-app-name"
primary_region = "cdg"

[build]

[env]
  STOCKFISH_PATH = "/usr/games/stockfish"
  MAX_DEPTH = "25"
  DEFAULT_DEPTH = "15"
  CORS_ORIGINS = "*"

[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0
  processes = ["app"]

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512
```

**Points importants** :
- `internal_port = 8000` (le port de ton app)
- `memory_mb = 512` (suffisant pour Stockfish)
- Variables d'environnement dans `[env]`

---

## 🚀 Étape 5 : Déployer

```bash
flyctl deploy
```

Fly.io va :
1. Builder l'image Docker
2. La pousser sur leur registry
3. Déployer l'app
4. Te donner une URL : `https://ton-app.fly.dev`

**Temps** : 2-3 minutes

---

## ✅ Étape 6 : Tester

```bash
# Health check
curl https://ton-app.fly.dev/health

# Test d'analyse
curl -X POST https://ton-app.fly.dev/analyze-position \
  -H "Content-Type: application/json" \
  -d '{"fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", "depth": 10}'
```

---

## 🔍 Étape 7 : Vérifier les logs

```bash
flyctl logs
```

Ou en temps réel :
```bash
flyctl logs --follow
```

---

## 🔄 Étape 8 : Mettre à jour l'App Mobile

```bash
eas secret:create --scope project --name EXPO_PUBLIC_ANALYSIS_API_URL --value https://ton-app.fly.dev --force
```

---

## 🎯 Commandes Utiles

### Voir le statut

```bash
flyctl status
```

### Voir les métriques

```bash
flyctl metrics
```

### Redéployer

```bash
flyctl deploy
```

### Voir les variables d'environnement

```bash
flyctl secrets list
```

### Modifier les variables

```bash
flyctl secrets set MAX_DEPTH=20
```

### Ouvrir l'app dans le navigateur

```bash
flyctl open
```

---

## 🐛 Dépannage

### L'app ne démarre pas

```bash
# Voir les logs
flyctl logs

# Vérifier le statut
flyctl status

# Redémarrer
flyctl apps restart ton-app-name
```

### Erreur : Stockfish not found

Vérifier que `STOCKFISH_PATH=/usr/games/stockfish` est dans `fly.toml` ou les secrets.

### Erreur : Port déjà utilisé

Vérifier que `internal_port = 8000` dans `fly.toml`.

### L'app est lente

Augmenter la mémoire dans `fly.toml` :
```toml
[[vm]]
  memory_mb = 1024  # Au lieu de 512
```

---

## 💰 Coûts

- **Gratuit** : 3 VMs partagées (suffisant pour beta)
- **Payant** : ~$1.94/mois par VM dédiée (512MB)

Pour la beta, le plan gratuit est largement suffisant.

---

## 🔒 Sécurité (Production)

Pour la production, mettre à jour `CORS_ORIGINS` :

```bash
flyctl secrets set CORS_ORIGINS="https://ton-domaine.com,https://app.ton-domaine.com"
```

---

## ✅ Checklist

- [ ] Fly CLI installé
- [ ] Connecté à Fly.io
- [ ] App créée avec `flyctl launch`
- [ ] `fly.toml` configuré correctement
- [ ] Déployé avec `flyctl deploy`
- [ ] Health check fonctionne
- [ ] Test d'analyse fonctionne
- [ ] URL mise à jour dans EAS
- [ ] App mobile testée

---

## 🎉 C'est tout !

Ton backend est maintenant déployé sur Fly.io et accessible 24/7 ! 🚀

**URL** : `https://ton-app.fly.dev`

