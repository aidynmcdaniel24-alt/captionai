"use client";

import {
  parseTheme,
  THEME_STORAGE_KEY,
  type Theme,
  writeThemeCookie,
} from "@/lib/theme-storage";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
} | null>(null);

function applyThemeToDocument(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

type ThemeProviderProps = {
  children: React.ReactNode;
  initialTheme: Theme;
};

export function ThemeProvider({ children, initialTheme }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  useEffect(() => {
    const fromStorage = parseTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
    if (fromStorage && fromStorage !== initialTheme) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- migrate legacy localStorage-only preference
      setThemeState(fromStorage);
    }
  }, [initialTheme]);

  useEffect(() => {
    applyThemeToDocument(theme);
    writeThemeCookie(theme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
