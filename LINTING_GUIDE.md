# Guide de linting et formatage

## 🛠️ Commandes essentielles

### Linting (ESLint)

```bash
# Vérifier toutes les erreurs de lint
npm run lint

# Auto-fix toutes les erreurs automatiquement
npm run lint -- --fix
```

### Formatage (Prettier)

```bash
# Vérifier le formatage (sans modifier)
npx prettier --check .

# Formater tous les fichiers
npx prettier --write .

# Formater un fichier spécifique
npx prettier --write app/index.tsx
```

### Les deux en même temps

```bash
# Lint + format automatique
npm run lint
npx prettier --write .
```

## 📝 Configuration VSCode

Un fichier `.vscode/settings.json` a été créé pour :

✅ **Auto-format on save** : Formate automatiquement avec Prettier à chaque sauvegarde
✅ **Auto-fix ESLint on save** : Corrige automatiquement les erreurs ESLint au save
✅ **Formatage pour JS/TS/JSON** : Tous les fichiers sont formatés avec Prettier

### Extensions recommandées

Installe ces extensions VSCode (elles apparaîtront automatiquement) :

- **Prettier - Code formatter** (`esbenp.prettier-vscode`)
- **ESLint** (`dbaeumer.vscode-eslint`)

## 🎯 Workflow recommandé

1. **Pendant le développement** :
   - Écris ton code normalement
   - Sauvegarde (Cmd/Ctrl + S)
   - Les erreurs sont auto-corrigées ✨

2. **Avant un commit** :

   ```bash
   npm run lint
   ```

3. **Si des erreurs persistent** :
   ```bash
   npm run lint -- --fix
   npx prettier --write .
   ```

## 🔍 Vérifier un fichier spécifique

```bash
# Lint un fichier/dossier
npx eslint app/components/GameCard.tsx

# Formater un fichier
npx prettier --write app/components/GameCard.tsx
```

## ⚙️ Configuration

### ESLint

- Config : `eslint.config.js`
- Extends : `eslint-config-expo` + `eslint-config-prettier`
- Plugins : `prettier` pour éviter les conflits

### Prettier

- Config : `.prettierrc` (trailing commas activées avec `"all"`)
- Ignore : `.prettierignore` (ignore node_modules, build files, etc.)
- Trailing commas : `"all"` pour correspondre à ESLint

## 🐛 Problèmes courants

### Les erreurs ne sont pas auto-corrigées au save

1. Vérifie que les extensions sont installées
2. Redémarre VSCode
3. Vérifie que ESLint est activé : Cmd/Ctrl + Shift + P → "ESLint: Show Output Channel"

### Formatage différent entre équipiers

```bash
# Assure-toi que tout le monde utilise les mêmes versions
npm install
```

### Conflit entre Prettier et ESLint

Le projet utilise `eslint-config-prettier` qui désactive les règles ESLint conflictuelles avec Prettier.

## 📚 Commandes rapides

| Action              | Commande                           |
| ------------------- | ---------------------------------- |
| Lint tout           | `npm run lint`                     |
| Fix tout            | `npm run lint -- --fix`            |
| Format tout         | `npx prettier --write .`           |
| Vérifier un fichier | `npx eslint fichier.tsx`           |
| Format un fichier   | `npx prettier --write fichier.tsx` |
