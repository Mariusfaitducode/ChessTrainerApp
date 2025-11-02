/**
 * Système d'espacements basé sur une échelle de 4px
 * Usage simple : spacing[2] = 8px, spacing[4] = 16px, etc.
 */

export const spacing = {
  0: 0,
  1: 4, // 4px
  2: 8, // 8px
  3: 12, // 12px
  4: 16, // 16px
  5: 20, // 20px
  6: 24, // 24px
  8: 32, // 32px
  10: 40, // 40px
  12: 48, // 48px
  16: 64, // 64px
  20: 80, // 80px
  24: 96, // 96px
} as const;

export type SpacingKey = keyof typeof spacing;
