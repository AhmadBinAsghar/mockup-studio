"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/useT";
import { currentTheme, setTheme, subscribeToTheme, type Theme } from "@/lib/theme";

export function ThemeToggle() {
  const { t } = useT();
  const theme = useSyncExternalStore<Theme>(subscribeToTheme, currentTheme, () => "light");
  const next: Theme = theme === "dark" ? "light" : "dark";
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={t(next === "dark" ? "theme.toDark" : "theme.toLight")}
      onClick={() => setTheme(next)}
    >
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}
