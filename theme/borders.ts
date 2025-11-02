/**
 * Système de bordures et rayons
 */

import { spacing } from "./spacing";

export const borders = {
  radius: {
    none: 0,
    sm: spacing[1], // 4px
    md: spacing[2], // 8px
    lg: spacing[3], // 12px
    xl: spacing[4], // 16px
    "2xl": spacing[6], // 24px
    full: 9999,
  },
  width: {
    none: 0,
    thin: 1,
    medium: 2,
    thick: 3,
  },
} as const;
