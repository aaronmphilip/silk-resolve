"use client";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex items-center gap-2 text-xs font-mono transition-colors
        text-black/50 hover:text-black
        dark:text-[#e8dece]/50 dark:hover:text-[#e8dece]"
    >
      {isDark ? <Sun size={11} /> : <Moon size={11} />}
      <span>{isDark ? "light mode" : "dark mode"}</span>
    </button>
  );
}
