# Système de design

Système de design minimaliste inspiré de shadcn/ui, avec une palette de couleurs basée sur la règle 60/30/10.

## 📐 Structure

- `colors.ts` - Palette de couleurs (60% blanc cassé, 30% orange, 10% brun)
- `spacing.ts` - Système d'espacements (échelle de 4px)
- `typography.ts` - Système de typographie
- `shadows.ts` - Ombres et élévations
- `borders.ts` - Bordures et rayons

## 🎨 Utilisation

```typescript
import { colors, spacing, typography, shadows, borders } from '@/theme';

// Couleurs
backgroundColor: colors.background.primary
color: colors.orange[500]

// Espacements
padding: spacing[4] // 16px
marginTop: spacing[6] // 24px

// Typographie
fontSize: typography.fontSize.lg
fontWeight: typography.fontWeight.semibold

// Ombres
...shadows.md

// Bordures
borderRadius: borders.radius.lg
```

## 🎨 Palette de couleurs

### 60% - Blanc cassé (Principal)
- `colors.background.primary` - #FAF9F6
- `colors.background.secondary` - #FFFFFF
- `colors.background.tertiary` - #F5F3F0

### 30% - Orange clair (Secondaire)
- `colors.orange[100]` à `colors.orange[600]`
- Principal : `colors.orange[500]` - #FF8C42

### 10% - Orange/Brun (Accent)
- `colors.accent[100]` à `colors.accent[500]`
- Principal : `colors.accent[400]` - #A05E2C

## 📏 Espacements

Tous basés sur une échelle de 4px :
- `spacing[1]` = 4px
- `spacing[2]` = 8px
- `spacing[4]` = 16px
- `spacing[6]` = 24px
- etc.

## ✍️ Typographie

- Tailles : `xs`, `sm`, `base`, `lg`, `xl`, `2xl`, `3xl`, `4xl`, `5xl`
- Poids : `normal`, `medium`, `semibold`, `bold`
