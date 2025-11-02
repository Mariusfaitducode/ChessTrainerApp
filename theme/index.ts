/**
 * Système de design centralisé
 * Style minimaliste inspiré de shadcn/ui
 */

// Ré-export pour facilité d'utilisation
import { colors } from "./colors";
import { spacing } from "./spacing";
import { typography } from "./typography";
import { shadows } from "./shadows";
import { borders } from "./borders";

export { colors } from "./colors";
export { spacing } from "./spacing";
export { typography } from "./typography";
export { shadows } from "./shadows";
export { borders } from "./borders";

export const theme = {
  colors,
  spacing,
  typography,
  shadows,
  borders,
} as const;
