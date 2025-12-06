# ⚡ Fly.io - Quick Start (5 minutes)

Guide ultra-rapide pour déployer sur Fly.io.

---

## 🚀 Commandes Rapides

### 1. Installer Fly CLI

```bash
brew install flyctl
# ou
curl -L https://fly.io/install.sh | sh
```

### 2. Se connecter

```bash
flyctl auth login
```

### 3. Déployer

```bash
cd backend
flyctl launch
```

Répondre aux questions :
- **App name** : Laisser par défaut ou choisir
- **Region** : `cdg` (Paris) ou `iad` (US)
- **Postgres/Redis** : Non

### 4. C'est tout !

Fly.io déploie automatiquement. URL : `https://ton-app.fly.dev`

---

## ✅ Tester

```bash
curl https://ton-app.fly.dev/health
```

---

## 🔄 Mettre à jour EAS

```bash
eas secret:create --scope project --name EXPO_PUBLIC_ANALYSIS_API_URL --value https://ton-app.fly.dev --force
```

---

**Voir `GUIDE_FLYIO.md` pour les détails complets.**

