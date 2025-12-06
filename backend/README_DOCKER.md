# 🐳 Backend avec Docker

Backend FastAPI containerisé avec Docker.

---

## 📁 Structure

```
backend/
├── Dockerfile          # Image Docker
├── docker-compose.yml  # Configuration pour tests locaux
├── requirements.txt    # Dépendances Python
└── app/               # Code de l'application
```

---

## 🚀 Commandes Rapides

### Build

```bash
docker build -t chess-backend .
```

### Run

```bash
docker run -p 8000:8000 chess-backend
```

### Avec Docker Compose

```bash
docker-compose up --build
```

---

## 🌐 Déploiement

Une fois testé en local, ce Dockerfile peut être déployé sur :
- **Railway** (supporte Docker)
- **Fly.io** (excellent pour Docker)
- **DigitalOcean App Platform**
- **AWS ECS / Fargate**
- **Google Cloud Run**

---

Voir `TEST_DOCKER.md` pour les tests en local.


