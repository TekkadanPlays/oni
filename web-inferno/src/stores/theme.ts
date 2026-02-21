// ---------------------------------------------------------------------------
// Theme store — persists base color theme + dark mode to localStorage
// Shared keys with mycelium.social so theme inherits across the ecosystem.
// ---------------------------------------------------------------------------

export type BaseTheme =
  | 'neutral' | 'stone' | 'zinc' | 'gray'
  | 'amber' | 'blue' | 'cyan' | 'emerald' | 'fuchsia' | 'green'
  | 'indigo' | 'lime' | 'orange' | 'pink' | 'purple' | 'red'
  | 'rose' | 'sky' | 'teal' | 'violet';

const THEME_KEY = 'ribbit_base_theme';
const DARK_KEY = 'ribbit_dark_mode';

type ThemeListener = () => void;
let _listeners: ThemeListener[] = [];

function notify() { _listeners.forEach((fn) => fn()); }

export function subscribeTheme(fn: ThemeListener): () => void {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter((l) => l !== fn); };
}

const VALID_THEMES: Set<string> = new Set([
  'neutral', 'stone', 'zinc', 'gray',
  'amber', 'blue', 'cyan', 'emerald', 'fuchsia', 'green',
  'indigo', 'lime', 'orange', 'pink', 'purple', 'red',
  'rose', 'sky', 'teal', 'violet',
]);

export function getBaseTheme(): BaseTheme {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored && VALID_THEMES.has(stored)) return stored as BaseTheme;
  return 'neutral';
}

export function setBaseTheme(theme: BaseTheme) {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme();
  notify();
}

export function isDarkMode(): boolean {
  const stored = localStorage.getItem(DARK_KEY);
  if (stored !== null) return stored === 'true';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function setDarkMode(dark: boolean) {
  localStorage.setItem(DARK_KEY, String(dark));
  applyTheme();
  notify();
}

export function toggleDarkMode() {
  setDarkMode(!isDarkMode());
}

export function applyTheme() {
  const html = document.documentElement;
  const dark = isDarkMode();
  const base = getBaseTheme();

  // Dark mode
  if (dark) {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }

  // Base color theme — remove all theme-* classes, then add current
  Array.from(html.classList)
    .filter((c) => c.startsWith('theme-'))
    .forEach((c) => html.classList.remove(c));
  if (base !== 'neutral') {
    html.classList.add(`theme-${base}`);
  }
}

// Migrate from old 'theme' key used by the previous ThemeToggle
function migrateOldKey() {
  const old = localStorage.getItem('theme');
  if (old && localStorage.getItem(DARK_KEY) === null) {
    localStorage.setItem(DARK_KEY, old === 'dark' ? 'true' : 'false');
    localStorage.removeItem('theme');
  }
}

// Initialize on load
export function initTheme() {
  migrateOldKey();
  applyTheme();
}
