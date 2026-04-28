"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { EmotionSlug } from "@/lib/theme/tokens";
import { BASE_PALETTE, EMOTION_THEMES } from "@/lib/theme/tokens";

type ThemeContextValue = {
  emotion: EmotionSlug;
  setEmotion: (emotion: EmotionSlug) => void;
  applyEmotionStyles: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [emotion, setEmotionState] = useState<EmotionSlug>("neutral");

  const setEmotion = useCallback((emotion: EmotionSlug) => {
    setEmotionState(emotion);
  }, []);

  const applyEmotionStyles = useCallback(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const overrides = EMOTION_THEMES[emotion];
    const vars: Record<string, string> = {
      "--soul-bg": BASE_PALETTE.bg,
      "--soul-bg-bottom": BASE_PALETTE.bgBottom,
      "--soul-card": BASE_PALETTE.card,
      "--soul-surface": BASE_PALETTE.surface,
      "--soul-ai": BASE_PALETTE.ai,
      "--soul-highlight": BASE_PALETTE.highlight,
      "--soul-primary": BASE_PALETTE.primary,
      "--soul-accent": BASE_PALETTE.accent,
      "--soul-primary-text": BASE_PALETTE.primaryText,
      "--soul-btn-text": BASE_PALETTE.btnText,
    };
    if (overrides) {
      if (overrides.bg) vars["--soul-bg"] = overrides.bg;
      if ("bgBottom" in overrides && overrides.bgBottom) vars["--soul-bg-bottom"] = overrides.bgBottom;
      if (overrides.card) vars["--soul-card"] = overrides.card;
      if (overrides.surface) vars["--soul-surface"] = overrides.surface;
      if (overrides.ai) vars["--soul-ai"] = overrides.ai;
      if (overrides.highlight) vars["--soul-highlight"] = overrides.highlight;
      if (overrides.primary) vars["--soul-primary"] = overrides.primary;
      if (overrides && "accent" in overrides && overrides.accent) vars["--soul-accent"] = overrides.accent;
      if (overrides.primaryText) vars["--soul-primary-text"] = overrides.primaryText;
      if ("btnText" in overrides && overrides.btnText) vars["--soul-btn-text"] = overrides.btnText;
    }
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [emotion]);

  // Apply on mount and when emotion changes
  useMemo(() => {
    if (typeof document !== "undefined") {
      const overrides = EMOTION_THEMES[emotion];
      const root = document.documentElement;
      const vars: Record<string, string> = {
        "--soul-bg": BASE_PALETTE.bg,
        "--soul-bg-bottom": BASE_PALETTE.bgBottom,
        "--soul-card": BASE_PALETTE.card,
        "--soul-surface": BASE_PALETTE.surface,
        "--soul-ai": BASE_PALETTE.ai,
        "--soul-highlight": BASE_PALETTE.highlight,
        "--soul-primary": BASE_PALETTE.primary,
        "--soul-accent": BASE_PALETTE.accent,
        "--soul-primary-text": BASE_PALETTE.primaryText,
        "--soul-btn-text": BASE_PALETTE.btnText,
      };
      if (overrides) {
        if (overrides.bg) vars["--soul-bg"] = overrides.bg;
        if ("bgBottom" in overrides && overrides.bgBottom) vars["--soul-bg-bottom"] = overrides.bgBottom;
        if (overrides.card) vars["--soul-card"] = overrides.card;
        if (overrides.surface) vars["--soul-surface"] = overrides.surface;
        if (overrides.ai) vars["--soul-ai"] = overrides.ai;
        if (overrides.highlight) vars["--soul-highlight"] = overrides.highlight;
        if (overrides.primary) vars["--soul-primary"] = overrides.primary;
        if ("accent" in overrides && overrides.accent) vars["--soul-accent"] = overrides.accent;
        if (overrides.primaryText) vars["--soul-primary-text"] = overrides.primaryText;
        if ("btnText" in overrides && overrides.btnText) vars["--soul-btn-text"] = overrides.btnText;
      }
      Object.entries(vars).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
    }
  }, [emotion]);

  const value: ThemeContextValue = useMemo(
    () => ({ emotion, setEmotion, applyEmotionStyles }),
    [emotion, setEmotion, applyEmotionStyles]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
