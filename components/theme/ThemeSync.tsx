"use client";

import { useEffect } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import type { EmotionSlug } from "@/lib/theme/tokens";

export function ThemeSync({ emotion }: { emotion: EmotionSlug }) {
  const { setEmotion } = useTheme();

  useEffect(() => {
    setEmotion(emotion);
  }, [emotion, setEmotion]);

  return null;
}

