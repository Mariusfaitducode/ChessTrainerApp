/**
 * Système de couleurs "Sketch & Play"
 * - Base : Noir & Blanc contrasté
 * - Accents : Couleurs "Pop" vives pour les badges
 */

export const colors = {
  // Palette "Modern Tactics" (Sérieux & Efficace)
  background: {
    primary: "#FAFAF9", // Stone 50 (Blanc cassé doux)
    secondary: "#FFFFFF", // Blanc pur pour les cartes (Élévation)
    tertiary: "#E7E5E4", // Stone 200 (Séparateurs doux)
    modal: "rgba(30, 41, 59, 0.7)", // Slate 900 transparent
  },

  // Texte & Traits
  text: {
    primary: "#1C1917", // Stone 900 (Presque noir, mais chaud)
    secondary: "#57534E", // Stone 600
    tertiary: "#A8A29E", // Stone 400
    disabled: "#D6D3D1",
    inverse: "#FFFFFF",
  },

  // Bordures (Subtiles)
  border: {
    light: "#F5F5F4", // Stone 100
    medium: "#E7E5E4", // Stone 200
    dark: "#78716C", // Stone 500
  },

  // Palette "Pop" pour l'UI et les actions
  primary: {
    main: "#1A1A1A", // Action principale Encre
    light: "#333333",
    dark: "#000000",
  },

  // Couleurs des coups (Badges d'analyse)
  chess: {
    brilliant: "#26C6DA", // !! Cyan
    great: "#4DB6AC", // ! Bleu-vert
    best: "#66BB6A", // ★ Vert
    excellent: "#9CCC65", // ✓ Vert clair
    good: "#42A5F5", // ! Bleu
    book: "#8D6E63", // 📖 Marron
    inaccuracy: "#FBC02D", // ?! Jaune
    mistake: "#FF9800", // ? Orange
    miss: "#FF4081", // ✕ Rose
    blunder: "#D32F2F", // ?? Rouge
  },
  
  // Legacy mappings (pour compatibilité temporaire, à refactoriser)
  orange: {
    50: "#FFF3E0",
    100: "#FFE0B2", 
    200: "#FFCC80",
    300: "#FFB74D",
    400: "#FFA726",
    500: "#FF9800", // Orange principal remplacé par la couleur "Mistake" ou action secondaire
    600: "#FB8C00",
  },

  // États fonctionnels
  success: {
    light: "#D4EDDA",
    main: "#66BB6A", // Vert "Best"
    dark: "#388E3C",
  },

  error: {
    light: "#FFEBEE",
    main: "#D32F2F", // Rouge "Blunder"
    dark: "#C62828",
  },

  warning: {
    light: "#FFFDE7",
    main: "#FBC02D", // Jaune "Inaccuracy"
    dark: "#F9A825",
  },

  info: {
    light: "#E3F2FD",
    main: "#42A5F5", // Bleu "Good"
    dark: "#1565C0",
  },
} as const;

export type ColorName = keyof typeof colors;
