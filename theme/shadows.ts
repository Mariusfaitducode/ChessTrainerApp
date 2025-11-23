/**
 * Système d'ombres "Clean Sketch"
 * Micro-reliefs nets
 */

import { ViewStyle } from "react-native";
import { colors } from "./colors";

export const shadows = {
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  } as ViewStyle,

  sm: {
    shadowColor: colors.text.primary,
    shadowOffset: { width: 1, height: 1 }, // Décalage minime
    shadowOpacity: 0.1,
    shadowRadius: 0,
    elevation: 1,
  } as ViewStyle,

  md: {
    shadowColor: colors.text.primary,
    shadowOffset: { width: 2, height: 2 }, // Décalage standard
    shadowOpacity: 0.15,
    shadowRadius: 0,
    elevation: 2,
  } as ViewStyle,

  lg: {
    shadowColor: colors.text.primary,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 3,
  } as ViewStyle,
} as const;
