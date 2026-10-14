"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { currentTheme, setTheme, subscribeToTheme, type Theme } from "@/lib/theme";

export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme>(subscribeToTheme, currentTheme, () => "light");
  const next: Theme = theme === "dark" ? "light" : "dark";
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={`Switch to ${next} theme`}
      onClick={() => setTheme(next)}
    >
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}
