/**
 * Système de bordures "Clean Sketch"
 * Traits fins et rayons modérés pour un look professionnel
 */

export const borders = {
  radius: {
    none: 0,
    sm: 4,  // Petit rayon net
    md: 8,  // Standard moderne (était 12)
    lg: 12, // Grand conteneur (était 16)
    xl: 16,
    "2xl": 24,
    full: 9999,
  },
  width: {
    none: 0,
    thin: 1,      // Trait standard fin (élégant)
    medium: 1.5,  // Légère emphase
    thick: 2,     // Contour marqué (mais plus 3 ou 4)
  },
} as const;
