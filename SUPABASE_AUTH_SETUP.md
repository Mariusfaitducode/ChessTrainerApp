# Configuration Supabase pour l'authentification

## ✅ Vérifications nécessaires

### 1. Email OTP activé

Pour que l'inscription fonctionne, Supabase doit être configuré pour envoyer des codes OTP par email.

Dans le dashboard Supabase :
1. Va dans **Authentication** → **Providers**
2. Assure-toi que **Email** est activé
3. Va dans **Authentication** → **Email Templates**
4. Vérifie que le template **Confirm signup** existe

### 2. Configuration du template OTP

Le template d'email doit afficher le token. Modifie le template dans **Authentication** → **Email Templates** → **Confirm signup** :

```html
<h2>Confirmer ton inscription</h2>
<p>Ton code de vérification :</p>
<p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">{{ .Token }}</p>
<p>Entre ce code dans l'application pour confirmer ton compte.</p>
```

### 3. Variables d'environnement

Assure-toi d'avoir dans ton `.env` :

```env
EXPO_PUBLIC_SUPABASE_URL=https://ton-projet.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=ton_anon_key
```

### 4. Test de connexion

1. **Inscription** :
   - Entre un email valide
   - Entre un mot de passe (min 6 caractères)
   - Clique sur "Créer mon compte"
   - Vérifie ta boîte email (et spam) pour le code OTP
   - Entre le code à 6 chiffres

2. **Connexion** :
   - Entre l'email et mot de passe créés
   - Tu devrais être redirigé automatiquement vers l'app

### 5. Problèmes courants

**Le code OTP n'arrive pas :**
- Vérifie tes spams
- Supabase envoie les emails via leur service (limité en gratuit)
- En développement, vérifie les logs dans Supabase Dashboard → Authentication → Logs

**Erreur "User already registered" :**
- L'email est déjà utilisé
- Essaie de te connecter au lieu de t'inscrire

**Redirection automatique ne fonctionne pas :**
- Vérifie que `useSupabase` détecte bien la session
- Vérifie les routes protégées dans `app/_layout.tsx`

## 📝 Notes

- L'authentification Supabase gère automatiquement les sessions
- Les tokens sont stockés dans AsyncStorage
- La session persiste entre les redémarrages de l'app
