/**
 * Theme constants for the GRC Range desktop shell.
 *
 * The GRC Range uses a single dark theme that mirrors the Windows Server
 * 2022 / Windows 11 dark-mode aesthetic. The theme is exposed as a typed
 * constant so every UI surface (login screen, desktop, windows, taskbar)
 * reads from the same palette, keeping colors consistent and avoiding magic
 * hex strings scattered across the DOM code.
 *
 * A `setTheme` / `applyTheme` API is provided so future themes can be added
 * without touching call sites, though only `dark` is defined today.
 */

/** A complete color palette for one theme. */
export interface Theme {
  /** Stable identifier used in code and CSS class names. */
  id: string;
  /** Human-readable theme name shown in any settings UI. */
  name: string;
  /** Root background color (desktop wallpaper base, full-screen surfaces). */
  bg: string;
  /** Surface color for panels, window bodies, and cards. */
  surface: string;
  /** Elevated surface color for popups, dropdowns, and floating cards. */
  surfaceElevated: string;
  /** Hover background for interactive surfaces. */
  surfaceHover: string;
  /** Border color for windows, inputs, and dividers. */
  border: string;
  /** Lighter border color for subtle dividers and separators. */
  borderSubtle: string;
  /** Primary text color. */
  text: string;
  /** Dimmed / secondary text color. */
  textDim: string;
  /** Accent color for buttons, links, and focus rings. */
  accent: string;
  /** Accent hover color. */
  accentHover: string;
  /** Danger / error color. */
  danger: string;
  /** Success / positive color. */
  success: string;
  /** Warning color. */
  warning: string;
}

/**
 * The set of named themes. Only `dark` is defined today; the structure allows
 * additional themes to be added without changing call sites.
 */
export const THEMES = {
  dark: {
    id: 'dark',
    name: 'Dark',
    bg: '#0d1117',
    surface: '#161b22',
    surfaceElevated: '#1c2330',
    surfaceHover: '#21283a',
    border: '#30363d',
    borderSubtle: '#21262d',
    text: '#e6edf3',
    textDim: '#8b949e',
    accent: '#2f81f7',
    accentHover: '#1f6feb',
    danger: '#f85149',
    success: '#3fb950',
    warning: '#d29922',
  },
} as const;

/** Union type of all valid theme identifiers. */
export type ThemeId = keyof typeof THEMES;

/** The currently active theme id. Defaults to `dark`. */
export let currentThemeId: ThemeId = 'dark';

/**
 * Switch the active theme by id.
 *
 * Updates the module-level {@link currentThemeId} and applies CSS custom
 * properties to `document.documentElement` so any DOM built with
 * `var(--grc-*)` references picks up the new palette immediately.
 */
export function setTheme(id: ThemeId): void {
  currentThemeId = id;
  applyTheme();
}

/**
 * Apply the current theme's palette to the document root as CSS custom
 * properties (`--grc-bg`, `--grc-surface`, etc.).
 *
 * Called once at startup and again whenever the theme changes. DOM elements
 * that use `var(--grc-*)` will update automatically.
 */
export function applyTheme(): void {
  const theme = THEMES[currentThemeId];
  const root = document.documentElement;
  root.style.setProperty('--grc-bg', theme.bg);
  root.style.setProperty('--grc-surface', theme.surface);
  root.style.setProperty('--grc-surface-elevated', theme.surfaceElevated);
  root.style.setProperty('--grc-surface-hover', theme.surfaceHover);
  root.style.setProperty('--grc-border', theme.border);
  root.style.setProperty('--grc-border-subtle', theme.borderSubtle);
  root.style.setProperty('--grc-text', theme.text);
  root.style.setProperty('--grc-text-dim', theme.textDim);
  root.style.setProperty('--grc-accent', theme.accent);
  root.style.setProperty('--grc-accent-hover', theme.accentHover);
  root.style.setProperty('--grc-danger', theme.danger);
  root.style.setProperty('--grc-success', theme.success);
  root.style.setProperty('--grc-warning', theme.warning);
}

/**
 * Return the current theme object.
 *
 * Prefer this over `THEMES[currentThemeId]` in application code so the
 * indirection can be adjusted in one place if needed.
 */
export function getTheme(): Theme {
  return THEMES[currentThemeId];
}
