# Debug - Synchronisation des parties

## Problème
"Aucune partie trouvée" lors de la synchronisation

## Logs de debug ajoutés

J'ai ajouté des `console.log` avec le préfixe `[Sync]` pour suivre le processus :

1. **Récupération des parties** : Nombre de parties récupérées depuis l'API
2. **Conversion** : Nombre de parties converties avec succès
3. **Doublons** : Vérification des parties déjà existantes
4. **Insertion** : Nombre de nouvelles parties insérées

## Pour déboguer

1. Ouvre les DevTools (React Native Debugger ou console Expo)
2. Lance une synchronisation
3. Regarde les logs `[Sync]` pour voir où ça bloque

## Causes possibles

### 1. L'API ne retourne pas de parties
- Vérifie que le username existe bien sur la plateforme
- Vérifie que le joueur a des parties récentes
- Pour Chess.com : peut prendre quelques secondes si beaucoup de parties

### 2. La conversion échoue
- Vérifie les logs `[Sync] Erreur lors de la conversion`
- Peut être dû à un format PGN invalide

### 3. Toutes les parties sont déjà importées
- Le message sera différent : "Toutes les parties sont déjà importées"

### 4. Problème avec les usernames
- Vérifie dans l'onglet Profil que le username est bien configuré
- Les usernames sont sensibles à la casse pour Chess.com

## Test manuel de l'API

Pour tester si l'API fonctionne, tu peux faire :

**Chess.com :**
```bash
curl "https://api.chess.com/pub/player/MAGNUSCARLSEN/games/archives"
```

**Lichess :**
```bash
curl "https://lichess.org/api/games/user/thibault?max=5"
```

## Prochaines étapes

Si après avoir regardé les logs tu vois toujours "Aucune partie trouvée", vérifie :
1. Les logs montrent combien de parties sont récupérées ?
2. Y a-t-il des erreurs lors de la conversion ?
3. Le username est-il correct dans la DB ?
