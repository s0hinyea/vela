export const theme = {
  colors: {
    background:    "#FAF7F2", // soft cream
    surface:       "#FFFFFF",
    surfaceWarm:   "#FFF8F0", // slightly warmer white for cards
    primary:       "#2D5A3D", // deep forest green
    primaryLight:  "#3D7A53", // lighter green for gradients/hover
    accent:        "#D4822A", // warm amber
    accentLight:   "#E8A84C", // lighter amber for glows
    accentSoft:    "rgba(212, 130, 42, 0.12)", // subtle amber tint
    textPrimary:   "#1A1A1A",
    textSecondary: "#6B6B6B",
    textOnPrimary: "#FFFFFF",
    success:       "#4CAF50",
    successSoft:   "rgba(76, 175, 80, 0.1)",
    warning:       "#FF9800",
    danger:        "#D32F2F",
    dangerSoft:    "rgba(211, 47, 47, 0.08)",
    border:        "#E8E2D9",
    borderLight:   "#F0EBE3",
    shadow:        "rgba(45, 90, 61, 0.08)",
  },
  fonts: {
    regular:    "Inter_400Regular",
    medium:     "Inter_500Medium",
    semiBold:   "Inter_600SemiBold",
    bold:       "Inter_700Bold",
    extraBold:  "Inter_800ExtraBold",
  },
  fontSizes: {
    xs:  14,
    sm:  16,
    md:  20,
    lg:  26,
    xl:  34,
    xxl: 44,
    hero: 52,
  },
  radii: {
    sm:   8,
    md:   16,
    lg:   24,
    xl:   32,
    full: 999,
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 20,
    lg: 32,
    xl: 48,
    xxl: 64,
  },
  shadows: {
    card: {
      shadowColor: "#2D5A3D",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    },
    soft: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
  },
} as const;

export type Theme = typeof theme;
