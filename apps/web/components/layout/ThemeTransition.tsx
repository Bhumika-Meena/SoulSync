"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import { useEffect, useState } from "react";

export function ThemeTransition() {
  const { emotion } = useTheme();
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    if (emotion !== "neutral") {
      setShowIndicator(true);
      const timer = setTimeout(() => setShowIndicator(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [emotion]);

  if (!showIndicator || emotion === "neutral") return null;

  const emotionLabels: Record<string, string> = {
    calm: "Calm Theme Active",
    sad: "Reflective Theme Active",
    happy: "Joyful Theme Active",
    anxious: "Soothing Theme Active",
    angry: "Muted Theme Active",
  };

  return (
    <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="soul-card px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-soul-accent animate-pulse" />
        <span className="text-sm font-medium text-soul-primary-text">
          {emotionLabels[emotion] || "Theme Updated"}
        </span>
      </div>
    </div>
  );
}
