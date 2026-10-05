import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class EmotionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieve recent emotion analyses for a user (useful for context and overview).
   */
  async getRecent(userId: string, limit = 10) {
    return this.prisma.emotionAnalysis.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        diaryEntryId: true,
        primaryEmotion: true,
        secondaryEmotion: true,
        intensity: true,
        createdAt: true,
      },
    });
  }

  /**
   * Aggregate emotion records over a specified time window (days) to compute trends.
   */
  async getTrends(userId: string, days = 7) {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const records = await this.prisma.emotionAnalysis.findMany({
      where: {
        userId,
        createdAt: { gte: sinceDate },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        diaryEntryId: true,
        primaryEmotion: true,
        secondaryEmotion: true,
        intensity: true,
        createdAt: true,
      },
    });

    const totalAnalyses = records.length;
    const distribution: Record<string, number> = {};
    let totalIntensity = 0;

    for (const record of records) {
      const emotion = record.primaryEmotion.toLowerCase();
      distribution[emotion] = (distribution[emotion] || 0) + 1;
      totalIntensity += record.intensity;
    }

    let dominantEmotion: string | null = null;
    let maxCount = 0;

    for (const [emotion, count] of Object.entries(distribution)) {
      if (count > maxCount) {
        maxCount = count;
        dominantEmotion = emotion;
      }
    }

    const averageIntensity = totalAnalyses > 0 ? +(totalIntensity / totalAnalyses).toFixed(2) : 0;

    return {
      windowDays: days,
      sinceDate: sinceDate.toISOString(),
      totalAnalyses,
      dominantEmotion,
      averageIntensity,
      distribution,
      timeline: records,
    };
  }

  /**
   * Create an emotion analysis record linked to a diary entry.
   */
  async createAnalysis(
    userId: string,
    diaryEntryId: string,
    data: { primaryEmotion: string; secondaryEmotion?: string | null; intensity: number }
  ) {
    return this.prisma.emotionAnalysis.create({
      data: {
        userId,
        diaryEntryId,
        primaryEmotion: data.primaryEmotion,
        secondaryEmotion: data.secondaryEmotion ?? null,
        intensity: data.intensity,
      },
    });
  }
}
