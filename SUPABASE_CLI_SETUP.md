# Installation Supabase CLI

## Option 1 : Via Homebrew (recommandé)

1. **Mettre à jour les Command Line Tools** :

```bash
sudo rm -rf /Library/Developer/CommandLineTools
sudo xcode-select --install
```

Puis réessayer :

```bash
brew install supabase/tap/supabase
```

## Option 2 : Téléchargement direct (plus rapide)

1. **Télécharger le binaire** :

```bash
cd /tmp
curl -L -o supabase.tar.gz https://github.com/supabase/cli/releases/download/v2.54.11/supabase_darwin_arm64.tar.gz
tar -xzf supabase.tar.gz
sudo mv supabase /usr/local/bin/
```

2. **Vérifier l'installation** :

```bash
supabase --version
```

## Option 3 : Via npm (local dans le projet)

Si tu préfères ne pas installer globalement, tu peux l'utiliser via npx :

```bash
npx supabase@latest --version
```

Puis utiliser `npx supabase` pour toutes les commandes.

---

## Après installation

Une fois installé, tu peux :

1. **Se connecter** :

```bash
supabase login
```

2. **Lier le projet** (récupère ton project-ref depuis le dashboard Supabase) :

```bash
supabase link --project-ref ton-project-ref
```

3. **Déployer la fonction** :

```bash
supabase functions deploy analyze-position
```


