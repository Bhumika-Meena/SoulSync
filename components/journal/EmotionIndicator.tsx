"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import type { EmotionSlug } from "@/lib/theme/tokens";

type EmotionIndicatorProps = {
  primaryEmotion: string;
  secondaryEmotion?: string | null;
  intensity: number;
};

export function EmotionIndicator({
  primaryEmotion,
  secondaryEmotion,
  intensity,
}: EmotionIndicatorProps) {
  const { emotion: currentTheme } = useTheme();

  function getEmotionEmoji(emotion: string): string {
    const l = emotion.toLowerCase();
    if (l.includes("happy") || l.includes("joy")) return "😊";
    if (l.includes("sad")) return "😢";
    if (l.includes("calm") || l.includes("peaceful")) return "😌";
    if (l.includes("anxious") || l.includes("worried")) return "😰";
    if (l.includes("angry") || l.includes("frustrated")) return "😠";
    return "😐";
  }

  const emoji = getEmotionEmoji(primaryEmotion);
  const intensityPercent = Math.round(intensity * 100);

  return (
    <div className="soul-card p-4 rounded-2xl border-2 border-soul-accent/30">
      <div className="flex items-center gap-3">
        <div className="text-3xl">{emoji}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-soul-primary-text">
              {primaryEmotion}
            </span>
            {secondaryEmotion && (
              <>
                <span className="text-soul-primary-text/60">/</span>
                <span className="text-soul-primary-text/80">{secondaryEmotion}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-white/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${intensityPercent}%`,
                  backgroundColor: `var(--soul-primary)`,
                }}
              />
            </div>
            <span className="text-sm text-soul-primary-text/70 font-medium">
              {intensityPercent}%
            </span>
          </div>
        </div>
        {currentTheme !== "neutral" && (
          <div className="text-xs text-soul-primary-text/60 bg-white/60 px-2 py-1 rounded-lg">
            Theme: {currentTheme}
          </div>
        )}
      </div>
    </div>
  );
}
