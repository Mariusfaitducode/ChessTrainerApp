export const colors = {
  bg: '#FAFAF9',
  bgElevated: '#FFFFFF',
  border: '#E7E5E4',
  text: '#1C1917',
  textMuted: '#57534E',
  accent: '#EA580C',
  accentPressed: '#C2410C',
  success: '#16A34A',
  danger: '#DC2626',
  warning: '#D97706',
  quality: {
    blunder: '#DC2626',
    mistake: '#F97316',
    inaccuracy: '#EAB308',
  },
  board: {
    light: '#F0D9B5',
    dark: '#B58863',
    highlightFrom: 'rgba(255, 234, 0, 0.45)',
    highlightTo: 'rgba(255, 234, 0, 0.65)',
    goodMove: 'rgba(22, 163, 74, 0.5)',
    badMove: 'rgba(220, 38, 38, 0.5)',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
} as const;

export const typography = {
  title: { fontSize: 28, fontWeight: '700' as const },
  heading: { fontSize: 20, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  label: { fontSize: 14, fontWeight: '500' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
} as const;
