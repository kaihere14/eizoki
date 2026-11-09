"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type ThemeName = "blue" | "pink";
export type ModeName = "light" | "dark";

export const THEMES: readonly { value: ThemeName; label: string }[] = [
  { value: "blue", label: "Blue" },
  { value: "pink", label: "Pink" },
];

export const MODES: readonly { value: ModeName; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/** Shared with the boot script in app/layout.tsx. */
const THEME_KEY = "eizoki:theme";
const MODE_KEY = "eizoki:mode";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// The <html data-theme> / <html data-mode> attributes are the source of truth,
// so the picker and the CSS always agree, including after a reload.
function getThemeSnapshot(): ThemeName {
  return document.documentElement.dataset.theme === "pink" ? "pink" : "blue";
}

function getModeSnapshot(): ModeName {
  return document.documentElement.dataset.mode === "light" ? "light" : "dark";
}

function getServerTheme(): ThemeName {
  return "blue";
}

// Dark is the default and is server-rendered on <html> in app/layout.tsx.
function getServerMode(): ModeName {
  return "dark";
}

function persist(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Private mode can block storage; the choice still applies for this page. */
  }
}

export function applyTheme(theme: ThemeName) {
  document.documentElement.dataset.theme = theme;
  persist(THEME_KEY, theme);
  for (const listener of listeners) listener();
}

export function applyMode(mode: ModeName) {
  document.documentElement.dataset.mode = mode;
  persist(MODE_KEY, mode);
  for (const listener of listeners) listener();
}

const ThemeContext = createContext<{
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  mode: ModeName;
  setMode: (mode: ModeName) => void;
} | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(
    subscribe,
    getThemeSnapshot,
    getServerTheme,
  );
  const mode = useSyncExternalStore(subscribe, getModeSnapshot, getServerMode);
  const setTheme = useCallback((next: ThemeName) => applyTheme(next), []);
  const setMode = useCallback((next: ModeName) => applyMode(next), []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
