# 🧪 Tester le Backend FastAPI

## ✅ Backend lancé sur le port 8010

## 1. Tester depuis le terminal

### Health check

```bash
curl http://127.0.0.1:8010/health
```

### Test d'analyse

```bash
curl -X POST http://127.0.0.1:8010/analyze-position \
  -H "Content-Type: application/json" \
  -d '{"fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", "depth": 15}'
```

## 2. Configurer l'app

Ajouter dans ton `.env` :

```env
EXPO_PUBLIC_ANALYSIS_API_URL=http://127.0.0.1:8010
```

**Important** : Pour tester depuis un téléphone/émulateur :

- Si tu utilises un émulateur Android : `http://10.0.2.2:8010`
- Si tu utilises un simulateur iOS : `http://localhost:8010` ou `http://127.0.0.1:8010`
- Si tu utilises un téléphone physique : utilise l'IP de ton Mac (ex: `http://192.168.1.94:8010`)

## 3. Tester depuis l'app

1. Redémarrer l'app Expo (pour charger la nouvelle variable d'environnement)
2. Aller sur une partie
3. Lancer une analyse
4. Vérifier les logs dans la console

## 4. Vérifier les logs

Tu devrais voir dans les logs de l'app :

```
[Analyzer] Backend: eval=... cp, bestMove=..., depth=...
```

Et dans les logs du backend :

```
INFO:     127.0.0.1:xxxxx - "POST /analyze-position HTTP/1.1" 200 OK
```

---

**Une fois que ça fonctionne, on pourra déployer le backend en production !** 🚀
