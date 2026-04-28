import { prisma } from "@/lib/db";

const EMOTIONS_FOR_LLM = 10;

/** Get today's diary entry for a user (start of day in UTC). */
export async function getTodaysEntry(userId: string) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return prisma.diaryEntry.findFirst({
    where: { userId, createdAt: { gte: start, lt: end } },
    orderBy: { createdAt: "desc" },
  });
}

/** Last N emotion analyses for LLM context only (no diary content). */
export async function getLastEmotionsForContext(userId: string, take = EMOTIONS_FOR_LLM) {
  return prisma.emotionAnalysis.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      primaryEmotion: true,
      secondaryEmotion: true,
      intensity: true,
      createdAt: true,
    },
  });
}

/** Latest weekly summary for LLM context. */
export async function getLatestWeeklySummary(userId: string) {
  return prisma.weeklySummary.findFirst({
    where: { userId },
    orderBy: { weekStart: "desc" },
  });
}

/** Create diary entry and return it. */
export async function createDiaryEntry(
  userId: string,
  content: string,
  options?: { htmlContent?: string | null; backgroundImage?: string | null }
) {
  return prisma.diaryEntry.create({
    data: {
      userId,
      content,
      htmlContent: options?.htmlContent ?? null,
      backgroundImage: options?.backgroundImage ?? null,
    },
  });
}

/** Create emotion analysis linked to entry. */
export async function createEmotionAnalysis(
  userId: string,
  diaryEntryId: string,
  data: { primaryEmotion: string; secondaryEmotion?: string | null; intensity: number }
) {
  return prisma.emotionAnalysis.create({
    data: {
      userId,
      diaryEntryId,
      primaryEmotion: data.primaryEmotion,
      secondaryEmotion: data.secondaryEmotion ?? null,
      intensity: data.intensity,
    },
  });
}

/** List recent diary entries for user (indexed by userId + createdAt). */
export async function listDiaryEntries(userId: string, limit = 50) {
  return prisma.diaryEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      emotionAnalyses: { take: 1, orderBy: { createdAt: "desc" } },
    },
  });
}

/** Get single entry by id if it belongs to user. */
export async function getDiaryEntryById(userId: string, entryId: string) {
  return prisma.diaryEntry.findFirst({
    where: { id: entryId, userId },
    include: { emotionAnalyses: true },
  });
}

/**
 * List diary entries since a given date (UTC-based timestamps).
 * Includes the latest emotion analysis per entry.
 * Used for insights charts/heatmaps.
 */
export async function listDiaryEntriesSince(userId: string, sinceDate: Date, limit = 200) {
  return prisma.diaryEntry.findMany({
    where: { userId, createdAt: { gte: sinceDate } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      emotionAnalyses: { take: 1, orderBy: { createdAt: "desc" } },
    },
  });
}
