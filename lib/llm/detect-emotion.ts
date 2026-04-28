/**
 * Detect emotions from diary entry text.
 * Uses LLM when API key is set; otherwise returns a stub based on keywords.
 */

import { parseEmotionFromLLM } from "./emotions";

export type EmotionDetectionResult = {
  primaryEmotion: string;
  secondaryEmotion: string | null;
  intensity: number;
};

const STUB_EMOTIONS = ["calm", "hopeful", "neutral", "grateful", "tired"];

function stubDetection(content: string): EmotionDetectionResult {
  const lower = content.toLowerCase();
  let primary = "neutral";
  let secondary: string | null = null;
  let intensity = 0.5;

  if (/\b(sad|down|lonely|miss|loss)\b/.test(lower)) {
    primary = "sad";
    intensity = 0.6;
  } else if (/\b(happy|joy|great|wonderful|excited)\b/.test(lower)) {
    primary = "happy";
    intensity = 0.7;
  } else if (/\b(anxious|worried|nervous|stress|afraid)\b/.test(lower)) {
    primary = "anxious";
    intensity = 0.65;
  } else if (/\b(angry|frustrated|mad|irritated)\b/.test(lower)) {
    primary = "angry";
    intensity = 0.6;
  } else if (/\b(calm|peaceful|relaxed)\b/.test(lower)) {
    primary = "calm";
    intensity = 0.5;
  }

  return { primaryEmotion: primary, secondaryEmotion: secondary, intensity };
}

export async function detectEmotionFromText(content: string): Promise<EmotionDetectionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  if ((!apiKey && !groqKey) || content.length < 20) {
    return stubDetection(content);
  }

  try {
    const url = groqKey
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";
    const key = groqKey ?? apiKey;
    const model = groqKey ? "llama-3.1-8b-instant" : "gpt-4o-mini";

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 150,
        messages: [
          {
            role: "system",
            content:
              "You analyze emotional tone. Reply with exactly: primary emotion, secondary emotion (or none), intensity 0-1. One line. Example: calm, hopeful, 0.6",
          },
          {
            role: "user",
            content: content.slice(0, 2000),
          },
        ],
      }),
    });

    if (!res.ok) return stubDetection(content);

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return stubDetection(content);

    const parsed = parseEmotionFromLLM(text);
    return {
      primaryEmotion: parsed.primaryEmotion,
      secondaryEmotion: parsed.secondaryEmotion,
      intensity: parsed.intensity,
    };
  } catch {
    return stubDetection(content);
  }
}
