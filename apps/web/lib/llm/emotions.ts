/**
 * Emotion detection from text.
 * Uses a small, deterministic prompt; can be swapped for an LLM call later.
 * Returns primary, secondary, intensity and a slug for theme.
 */

export const EMOTION_SLUGS = [
  "calm",
  "sad",
  "happy",
  "anxious",
  "angry",
  "neutral",
  "grateful",
  "hopeful",
  "confused",
  "tired",
] as const;

export type EmotionSlug = (typeof EMOTION_SLUGS)[number];

export type EmotionResult = {
  primaryEmotion: string;
  secondaryEmotion: string | null;
  intensity: number; // 0–1
  slug: EmotionSlug;
};

/** Map emotion label to theme slug for emotion-adaptive UI. */
export function emotionToThemeSlug(primary: string): EmotionSlug {
  const lower = primary.toLowerCase();
  if (["calm", "peaceful", "relaxed"].some((e) => lower.includes(e))) return "calm";
  if (["sad", "down", "low", "grief", "lonely"].some((e) => lower.includes(e))) return "sad";
  if (["happy", "joy", "excited", "grateful", "hopeful"].some((e) => lower.includes(e))) return "happy";
  if (["anxious", "worried", "nervous", "stressed"].some((e) => lower.includes(e))) return "anxious";
  if (["angry", "frustrated", "irritated", "mad"].some((e) => lower.includes(e))) return "angry";
  return "neutral";
}

/** Stub: parse a simple "primary, secondary, intensity" response. Defaults for demo. */
export function parseEmotionFromLLM(text: string): EmotionResult {
  const normalized = text.toLowerCase().trim();
  let primary = "neutral";
  let secondary: string | null = null;
  let intensity = 0.5;

  for (const slug of EMOTION_SLUGS) {
    if (normalized.includes(slug)) {
      if (primary === "neutral") primary = slug;
      else if (!secondary) secondary = slug;
    }
  }

  const numMatch = text.match(/\b(0?\.\d+|\d+(\.\d+)?)\b/);
  if (numMatch) {
    const n = parseFloat(numMatch[1]);
    if (n >= 0 && n <= 1) intensity = n;
    else if (n >= 1 && n <= 5) intensity = n / 5;
  }

  return {
    primaryEmotion: primary,
    secondaryEmotion: secondary,
    intensity,
    slug: emotionToThemeSlug(primary) as EmotionSlug,
  };
}
