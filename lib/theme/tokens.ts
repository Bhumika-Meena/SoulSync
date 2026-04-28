/**
 * SoulSync theme tokens.
 * Beautiful, vibrant pastel palette; emotion-adaptive overrides create comforting visual harmony.
 */

export const BASE_PALETTE = {
  bg: "#fbf7e8", // WellnessAI cream
  bgBottom: "#f6f0cf", // Warm yellow wash
  card: "#ffffff", // White cards
  surface: "#ffffff", // Header surface
  ai: "#0f172a", // Dark guide panel (used sparingly)
  highlight: "#fff3b0", // Soft highlight
  primary: "#f4d34c", // Wellness yellow
  accent: "#fbbf24", // Amber accent
  primaryText: "#0f172a",
  btnText: "#111827", // Dark text on yellow
} as const;

export type EmotionSlug =
  | "neutral"
  | "calm"
  | "sad"
  | "happy"
  | "anxious"
  | "angry";

/**
 * Emotion-adaptive theme overrides.
 * Beautiful pastel combinations that adapt to emotions while staying harmonious.
 */
export const EMOTION_THEMES: Record<
  EmotionSlug,
  Partial<Record<keyof typeof BASE_PALETTE, string>>
> = {
  neutral: {},
  calm: {
    bg: "#f2f8ed", // Mint-cream calm
    bgBottom: "#e8f2dd",
    highlight: "#d1fae5",
    accent: "#34d399",
  },
  sad: {
    bg: "#f6f3ff", // Lavender-cream
    bgBottom: "#efeaff",
    highlight: "#e9d5ff",
    accent: "#a78bfa",
  },
  happy: {
    bg: "#fff7df", // Sunny cream
    bgBottom: "#fff0c2",
    highlight: "#fde68a",
    accent: "#f59e0b",
  },
  anxious: {
    bg: "#f3f7fb", // Cool clarity
    bgBottom: "#eaf2ff",
    highlight: "#bfdbfe",
    accent: "#60a5fa",
  },
  angry: {
    bg: "#fff1f2", // Soft rose reset
    bgBottom: "#ffe4e6",
    highlight: "#fecdd3",
    accent: "#fb7185",
  },
};
