/**
 * Système de couleurs basé sur la règle 60/30/10
 * - 60% : Blanc cassé (couleur principale)
 * - 30% : Orange clair (couleur secondaire)
 * - 10% : Orange/Brun (accent)
 */

export const colors = {
  // Palette principale (60%)
  background: {
    primary: "#FAF9F6", // Blanc cassé principal
    secondary: "#FFFFFF", // Blanc pur
    tertiary: "#F5F3F0", // Blanc cassé plus foncé
  },

  // Palette secondaire (30%)
  orange: {
    50: "#FFF5EB", // Orange très clair
    100: "#FFE8CC", // Orange clair
    200: "#FFD4A3", // Orange moyen-clair
    300: "#FFC078", // Orange moyen
    400: "#FFA94D", // Orange vif
    500: "#FF8C42", // Orange principal (30%)
    600: "#E6772E", // Orange foncé
  },

  // Palette accent (10%)
  accent: {
    50: "#F4E6D7", // Brun très clair
    100: "#E8CCB3", // Brun clair
    200: "#D4A574", // Brun moyen
    300: "#C17A3D", // Brun foncé
    400: "#A05E2C", // Brun principal (10%)
    500: "#7D4720", // Brun très foncé
  },

  // Couleurs fonctionnelles
  text: {
    primary: "#1A1A1A", // Presque noir
    secondary: "#4A4A4A", // Gris foncé
    tertiary: "#8A8A8A", // Gris moyen
    disabled: "#C4C4C4", // Gris clair
    inverse: "#FFFFFF", // Blanc pour fonds foncés
  },

  border: {
    light: "#E8E8E8", // Bordure claire
    medium: "#D4D4D4", // Bordure moyenne
    dark: "#A0A0A0", // Bordure foncée
  },

  // États
  success: {
    light: "#D4EDDA",
    main: "#28A745",
    dark: "#1E7E34",
  },

  error: {
    light: "#F8D7DA",
    main: "#DC3545",
    dark: "#C82333",
  },

  warning: {
    light: "#FFF3CD",
    main: "#FFC107",
    dark: "#E0A800",
  },

  info: {
    light: "#D1ECF1",
    main: "#17A2B8",
    dark: "#117A8B",
  },
} as const;

export type ColorName = keyof typeof colors;
