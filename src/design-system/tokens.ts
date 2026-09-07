export const foundationThemes = ["light", "dark"] as const;

export type FoundationTheme = (typeof foundationThemes)[number];

export const foundationColorTokens = [
  "canvas",
  "surface",
  "surface-raised",
  "text-primary",
  "text-secondary",
  "text-muted",
  "border-subtle",
  "border-strong",
  "primary",
  "primary-foreground",
  "accent",
  "accent-foreground",
  "status-success",
  "status-success-foreground",
  "status-warning",
  "status-warning-foreground",
  "status-danger",
  "status-danger-foreground",
  "focus",
] as const;

export type FoundationColorToken = (typeof foundationColorTokens)[number];

type ThemeColorValues = Record<FoundationColorToken, `#${string}`>;

export const foundationColorValues: Record<FoundationTheme, ThemeColorValues> = {
  light: {
    canvas: "#f8fafc",
    surface: "#ffffff",
    "surface-raised": "#eef2ff",
    "text-primary": "#0f172a",
    "text-secondary": "#334155",
    "text-muted": "#475569",
    "border-subtle": "#cbd5e1",
    "border-strong": "#64748b",
    primary: "#4338ca",
    "primary-foreground": "#ffffff",
    accent: "#a21caf",
    "accent-foreground": "#ffffff",
    "status-success": "#047857",
    "status-success-foreground": "#ffffff",
    "status-warning": "#a16207",
    "status-warning-foreground": "#ffffff",
    "status-danger": "#be123c",
    "status-danger-foreground": "#ffffff",
    focus: "#4338ca",
  },
  dark: {
    canvas: "#01030a",
    surface: "#111827",
    "surface-raised": "#172036",
    "text-primary": "#f8fafc",
    "text-secondary": "#cbd5e1",
    "text-muted": "#94a3b8",
    "border-subtle": "#334155",
    "border-strong": "#94a3b8",
    primary: "#a5b4fc",
    "primary-foreground": "#111827",
    accent: "#f0abfc",
    "accent-foreground": "#3b0764",
    "status-success": "#6ee7b7",
    "status-success-foreground": "#052e16",
    "status-warning": "#fde68a",
    "status-warning-foreground": "#451a03",
    "status-danger": "#fda4af",
    "status-danger-foreground": "#4c0519",
    focus: "#a5b4fc",
  },
};

export const foundationColorCssProperties: Record<
  FoundationColorToken,
  `--glowy-color-${string}`
> = {
  canvas: "--glowy-color-canvas",
  surface: "--glowy-color-surface",
  "surface-raised": "--glowy-color-surface-raised",
  "text-primary": "--glowy-color-text-primary",
  "text-secondary": "--glowy-color-text-secondary",
  "text-muted": "--glowy-color-text-muted",
  "border-subtle": "--glowy-color-border-subtle",
  "border-strong": "--glowy-color-border-strong",
  primary: "--glowy-color-primary",
  "primary-foreground": "--glowy-color-primary-foreground",
  accent: "--glowy-color-accent",
  "accent-foreground": "--glowy-color-accent-foreground",
  "status-success": "--glowy-color-status-success",
  "status-success-foreground": "--glowy-color-status-success-foreground",
  "status-warning": "--glowy-color-status-warning",
  "status-warning-foreground": "--glowy-color-status-warning-foreground",
  "status-danger": "--glowy-color-status-danger",
  "status-danger-foreground": "--glowy-color-status-danger-foreground",
  focus: "--glowy-color-focus",
};

export const foundationRequiredCssProperties = [
  ...Object.values(foundationColorCssProperties),
  "--glowy-font-sans",
  "--glowy-font-display",
  "--glowy-space-1",
  "--glowy-space-2",
  "--glowy-space-3",
  "--glowy-space-4",
  "--glowy-space-6",
  "--glowy-space-8",
  "--glowy-radius-control",
  "--glowy-radius-panel",
  "--glowy-radius-pill",
  "--glowy-border-width",
  "--glowy-elevation-panel",
  "--glowy-elevation-glow",
  "--glowy-focus-width",
  "--glowy-focus-offset",
  "--glowy-motion-fast",
  "--glowy-motion-standard",
  "--glowy-motion-orbit",
  "--glowy-touch-target",
] as const;

type FoundationTokenPairing = {
  name: string;
  foreground: FoundationColorToken;
  background: FoundationColorToken;
  minimumContrast: 3 | 4.5;
};

export const foundationTokenPairings: readonly FoundationTokenPairing[] = [
  {
    name: "Основной текст на поверхности",
    foreground: "text-primary",
    background: "surface",
    minimumContrast: 4.5,
  },
  {
    name: "Вторичный текст на поверхности",
    foreground: "text-secondary",
    background: "surface",
    minimumContrast: 4.5,
  },
  {
    name: "Спокойный текст на холсте",
    foreground: "text-muted",
    background: "canvas",
    minimumContrast: 4.5,
  },
  {
    name: "Текст главного действия",
    foreground: "primary-foreground",
    background: "primary",
    minimumContrast: 4.5,
  },
  {
    name: "Текст акцента",
    foreground: "accent-foreground",
    background: "accent",
    minimumContrast: 4.5,
  },
  {
    name: "Текст статуса успеха",
    foreground: "status-success-foreground",
    background: "status-success",
    minimumContrast: 4.5,
  },
  {
    name: "Текст статуса внимания",
    foreground: "status-warning-foreground",
    background: "status-warning",
    minimumContrast: 4.5,
  },
  {
    name: "Текст статуса риска",
    foreground: "status-danger-foreground",
    background: "status-danger",
    minimumContrast: 4.5,
  },
  {
    name: "Сильная интерактивная граница",
    foreground: "border-strong",
    background: "surface",
    minimumContrast: 3,
  },
  {
    name: "Focus-индикатор",
    foreground: "focus",
    background: "surface",
    minimumContrast: 3,
  },
] as const;
