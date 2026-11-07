"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type ThemeName = "blue" | "pink";

export const THEMES: readonly { value: ThemeName; label: string }[] = [
  { value: "blue", label: "Blue" },
  { value: "pink", label: "Pink" },
];

/** Shared with the boot script in app/layout.tsx. */
const STORAGE_KEY = "eizoki:theme";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// The <html data-theme> attribute is the source of truth, so the picker and
// the CSS always agree, including after a reload.
function getSnapshot(): ThemeName {
  return document.documentElement.dataset.theme === "pink" ? "pink" : "blue";
}

function getServerSnapshot(): ThemeName {
  return "blue";
}

export function applyTheme(theme: ThemeName) {
  document.documentElement.dataset.theme = theme;

  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* Private mode can block storage; the theme still applies for this page. */
  }

  for (const listener of listeners) listener();
}

const ThemeContext = createContext<{
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
} | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setTheme = useCallback((next: ThemeName) => applyTheme(next), []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
