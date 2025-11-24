/**
 * Système de bordures "Modern Tactics"
 * Rayons fluides et traits subtils
 */

export const borders = {
  radius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16, // Standard carte
    "2xl": 24,
    full: 9999,

    // Semantic aliases
    card: 16,
    button: 12,
    pill: 9999,
  },
  width: {
    none: 0,
    thin: 1,
    medium: 1.5,
    thick: 2,
  },
} as const;
