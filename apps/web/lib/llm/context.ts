/**
 * LLM context builder for SoulSync.
 * STRICT: Only today's entry text + last N emotions + latest weekly summary.
 * Never send full diary history.
 */

import { getTodaysEntry, getLastEmotionsForContext, getLatestWeeklySummary } from "@/lib/db/queries";

export type ContextForLLM = {
  todaysEntryText: string | null;
  recentEmotions: Array<{
    primaryEmotion: string;
    secondaryEmotion: string | null;
    intensity: number;
    createdAt: Date;
  }>;
  latestSummaryText: string | null;
};

export async function buildContextForUser(userId: string): Promise<ContextForLLM> {
  const [todaysEntry, recentEmotions, latestSummary] = await Promise.all([
    getTodaysEntry(userId),
    getLastEmotionsForContext(userId),
    getLatestWeeklySummary(userId),
  ]);

  return {
    todaysEntryText: todaysEntry?.content ?? null,
    recentEmotions: recentEmotions.map((e) => ({
      primaryEmotion: e.primaryEmotion,
      secondaryEmotion: e.secondaryEmotion,
      intensity: e.intensity,
      createdAt: e.createdAt,
    })),
    latestSummaryText: latestSummary?.content ?? null,
  };
}

/** Serialize context into a string for the LLM system/context message. */
export function serializeContextForPrompt(ctx: ContextForLLM): string {
  const parts: string[] = [];

  if (ctx.todaysEntryText) {
    parts.push("Today's diary entry (only):\n" + ctx.todaysEntryText);
  } else {
    parts.push("No diary entry for today yet.");
  }

  if (ctx.recentEmotions.length > 0) {
    parts.push(
      "\nRecent emotions (last entries, for context only):\n" +
        ctx.recentEmotions
          .map(
            (e) =>
              `- ${e.primaryEmotion}` +
              (e.secondaryEmotion ? ` / ${e.secondaryEmotion}` : "") +
              ` (intensity: ${e.intensity})`
          )
          .join("\n")
    );
  }

  if (ctx.latestSummaryText) {
    parts.push("\nLatest weekly summary:\n" + ctx.latestSummaryText);
  }

  return parts.join("\n\n");
}
