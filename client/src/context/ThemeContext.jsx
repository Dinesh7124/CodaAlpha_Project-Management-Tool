import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

export const THEMES = {
  indigo: { name: "Indigo", primary: "#6366f1", secondary: "#8b5cf6" },
  blue: { name: "Ocean", primary: "#3b82f6", secondary: "#06b6d4" },
  emerald: { name: "Forest", primary: "#10b981", secondary: "#14b8a6" },
  rose: { name: "Rose", primary: "#f43f5e", secondary: "#ec4899" },
  amber: { name: "Sunset", primary: "#f59e0b", secondary: "#f97316" },
  slate: { name: "Mono", primary: "#475569", secondary: "#64748b" },
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [accent, setAccent] = useState(() => localStorage.getItem("accent") || "indigo");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const t = THEMES[accent] || THEMES.indigo;
    document.documentElement.style.setProperty("--accent-primary", t.primary);
    document.documentElement.style.setProperty("--accent-secondary", t.secondary);
    document.documentElement.style.setProperty("--accent-accent", t.secondary);
    localStorage.setItem("accent", accent);
  }, [accent]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme, accent, setAccent, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}
