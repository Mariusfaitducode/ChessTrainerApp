# 🐳 Test Docker en Local

Guide pour tester le backend avec Docker avant de déployer.

---

## 🚀 Test Rapide (2 minutes)

### 1. Construire l'image Docker

```bash
cd backend
docker build -t chess-backend .
```

### 2. Lancer le conteneur

```bash
docker run -p 8000:8000 chess-backend
```

### 3. Tester

Dans un autre terminal :

```bash
# Health check
curl http://localhost:8000/health

# Test d'analyse
curl -X POST http://localhost:8000/analyze-position \
  -H "Content-Type: application/json" \
  -d '{"fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", "depth": 10}'
```

---

## 🐳 Avec Docker Compose (Recommandé)

### 1. Lancer

```bash
cd backend
docker-compose up --build
```

### 2. Tester

```bash
curl http://localhost:8000/health
```

### 3. Arrêter

```bash
docker-compose down
```

---

## ✅ Résultats Attendus

### Health Check

```json
{"status":"ok"}
```

### Analyse

```json
{
  "best_move": "e2e4",
  "evaluation": 35,
  "evaluation_type": "cp",
  "depth": 10,
  "mate_in": null,
  "nodes": 123456,
  "analysis_time_ms": 842.5
}
```

---

## 🐛 Dépannage

### Erreur : port already in use

```bash
# Changer le port dans docker-compose.yml
ports:
  - "8001:8000"  # Utiliser le port 8001 au lieu de 8000
```

### Erreur : Stockfish not found

Vérifier les logs :
```bash
docker-compose logs backend
```

### Rebuild complet

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up
```

---

## 📝 Vérifier les logs

```bash
# Avec docker-compose
docker-compose logs -f backend

# Avec docker run
docker logs <container-id>
```

---

Une fois que ça fonctionne en local, on pourra déployer facilement ! 🚀


