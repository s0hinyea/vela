export const theme = {
  colors: {
    background:    "#FAF7F2", // soft cream
    surface:       "#FFFFFF",
    primary:       "#2D5A3D", // deep forest green
    accent:        "#D4822A", // warm amber
    textPrimary:   "#1A1A1A",
    textSecondary: "#6B6B6B",
    textOnPrimary: "#FFFFFF",
    success:       "#4CAF50",
    warning:       "#FF9800",
    danger:        "#D32F2F",
    border:        "#E8E2D9",
  },
  fontSizes: {
    xs:  14,
    sm:  16,
    md:  20,
    lg:  26,
    xl:  34,
    xxl: 44,
  },
  radii: {
    sm:   8,
    md:   16,
    lg:   24,
    full: 999,
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 20,
    lg: 32,
    xl: 48,
  },
} as const;

export type Theme = typeof theme;
