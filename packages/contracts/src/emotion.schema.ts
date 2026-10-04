import { z } from "zod";

export const EmotionSlugSchema = z.enum([
  "neutral",
  "calm",
  "sad",
  "happy",
  "anxious",
  "angry",
]);

export type EmotionSlug = z.infer<typeof EmotionSlugSchema>;

export const EmotionAnalysisSchema = z.object({
  primaryEmotion: z.string(),
  secondaryEmotion: z.string().nullable().optional(),
  intensity: z.number().min(0).max(1),
  slug: EmotionSlugSchema,
});

export type EmotionAnalysisDTO = z.infer<typeof EmotionAnalysisSchema>;

export const EmotionTrendsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
});

export type EmotionTrendsQueryDTO = z.infer<typeof EmotionTrendsQuerySchema>;
