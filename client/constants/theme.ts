import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#2C1810",
    textSecondary: "#6B5D56",
    buttonText: "#FFFFFF",
    tabIconDefault: "#6B5D56",
    tabIconSelected: "#8B4513",
    link: "#8B4513",
    linkLight: "#A0633D",
    backgroundRoot: "#FDF8F3",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#F5EDE5",
    backgroundTertiary: "#E8DED0",
    accent: "#D4A574",
    success: "#4A7C59",
    error: "#B85C50",
    border: "#E8DED0",
    inputBackground: "#FFFFFF",
    cardBorder: "#E8DED0",
  },
  dark: {
    text: "#F5EDE5",
    textSecondary: "#A89B94",
    buttonText: "#FFFFFF",
    tabIconDefault: "#A89B94",
    tabIconSelected: "#D4A574",
    link: "#D4A574",
    linkLight: "#E8C4A0",
    backgroundRoot: "#1F1814",
    backgroundDefault: "#2A221E",
    backgroundSecondary: "#352D28",
    backgroundTertiary: "#403832",
    accent: "#D4A574",
    success: "#6B9B7A",
    error: "#D08070",
    border: "#403832",
    inputBackground: "#2A221E",
    cardBorder: "#403832",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 48,
  "5xl": 56,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 18,
  lg: 24,
  xl: 30,
  "2xl": 40,
  "3xl": 50,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 34,
    lineHeight: 42,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "600" as const,
  },
  h3: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 26,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 16,
    lineHeight: 26,
    fontWeight: "500" as const,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400" as const,
  },
  chatMessage: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  chatTimestamp: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "400" as const,
  },
  inputPlaceholder: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const Shadows = {
  button: {
    shadowColor: "#2C1810",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  card: {
    shadowColor: "#2C1810",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
};
