import {
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ThemeContext, type ThemeName } from "./ThemeContext";

const storageKey = "aicte-theme";

function getInitialTheme(): ThemeName {
  try {
    return window.sessionStorage.getItem(storageKey) === "neo-brutalism"
      ? "neo-brutalism"
      : "professional";
  } catch {
    return "professional";
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>(getInitialTheme);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.sessionStorage.setItem(storageKey, theme);
    } catch {
      // The selected theme still applies when browser storage is unavailable.
    }
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
