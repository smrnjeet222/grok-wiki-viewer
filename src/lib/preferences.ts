export type ThemePreference = "system" | "light" | "dark";
export type ProsePreference = "sans" | "serif";
export type TextSizePreference = "small" | "default" | "large";
export type SpacingPreference = "compact" | "comfortable";
export type MeasurePreference = "narrow" | "default" | "wide";

export interface ReaderPreferences {
  theme: ThemePreference;
  prose: ProsePreference;
  textSize: TextSizePreference;
  spacing: SpacingPreference;
  measure: MeasurePreference;
}

export const DEFAULT_PREFERENCES: ReaderPreferences = {
  theme: "system",
  prose: "sans",
  textSize: "default",
  spacing: "comfortable",
  measure: "default",
};

const STORAGE_KEY = "local-wiki-reader-preferences";

const allowed = {
  theme: ["system", "light", "dark"],
  prose: ["sans", "serif"],
  textSize: ["small", "default", "large"],
  spacing: ["compact", "comfortable"],
  measure: ["narrow", "default", "wide"],
} as const;

function pick<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return typeof value === "string" && values.includes(value as T) ? (value as T) : fallback;
}

export function readPreferences(): ReaderPreferences {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as Partial<ReaderPreferences>;
    return {
      theme: pick(parsed.theme, allowed.theme, DEFAULT_PREFERENCES.theme),
      prose: pick(parsed.prose, allowed.prose, DEFAULT_PREFERENCES.prose),
      textSize: pick(parsed.textSize, allowed.textSize, DEFAULT_PREFERENCES.textSize),
      spacing: pick(parsed.spacing, allowed.spacing, DEFAULT_PREFERENCES.spacing),
      measure: pick(parsed.measure, allowed.measure, DEFAULT_PREFERENCES.measure),
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(preferences: ReaderPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Persistence may be blocked; current-session preferences still work.
  }
}

export function resolvedTheme(theme: ThemePreference): "light" | "dark" {
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyPreferences(preferences: ReaderPreferences): void {
  const root = document.documentElement;
  const theme = resolvedTheme(preferences.theme);
  root.dataset.theme = theme;
  root.dataset.prose = preferences.prose;
  root.dataset.textSize = preferences.textSize;
  root.dataset.spacing = preferences.spacing;
  root.dataset.measure = preferences.measure;
  root.style.colorScheme = theme;
}
