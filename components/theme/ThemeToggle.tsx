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
      className="flex items-center transition-colors p-1
        text-black/50 hover:text-black
        dark:text-[#e8dece]/50 dark:hover:text-[#e8dece]"
    >
      {isDark ? <Sun size={12} /> : <Moon size={12} />}
    </button>
  );
}
