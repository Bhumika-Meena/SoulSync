import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import type { Prisma } from "@prisma/client";
import type {
  CreateJournalEntryDTO,
  JournalQueryDTO,
} from "@soulsync/contracts";

@Injectable()
export class JournalService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List paginated active journal entries for a user, ordered by creation date descending.
   * Respects soft deletes (deletedAt: null).
   */
  async listEntries(userId: string, query?: JournalQueryDTO) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.DiaryEntryWhereInput = {
      userId,
      deletedAt: null,
      ...(query?.search
        ? {
            OR: [
              {
                content: {
                  contains: query.search,
                  mode: "insensitive" as const,
                },
              },
              {
                plainText: {
                  contains: query.search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    };

    const [entries, total] = await Promise.all([
      this.prisma.diaryEntry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          emotionAnalyses: {
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      this.prisma.diaryEntry.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Retrieve a single active journal entry by ID for a user.
   */
  async getEntryById(userId: string, entryId: string) {
    const entry = await this.prisma.diaryEntry.findFirst({
      where: { id: entryId, userId, deletedAt: null },
      include: {
        emotionAnalyses: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException({
        code: "ENTRY_NOT_FOUND",
        message: `Journal entry with ID ${entryId} not found`,
      });
    }

    return entry;
  }

  /**
   * Create a new journal entry supporting both legacy and Phase 2 fields.
   */
  async createEntry(userId: string, dto: CreateJournalEntryDTO) {
    const contentJson = dto.contentJson
      ? (dto.contentJson as Prisma.InputJsonValue)
      : undefined;

    return this.prisma.diaryEntry.create({
      data: {
        userId,
        content: dto.content,
        htmlContent: dto.htmlContent ?? null,
        backgroundImage: dto.backgroundImage ?? null,
        contentJson,
        plainText: dto.plainText ?? dto.content,
        assetUrl: dto.assetUrl ?? null,
      },
      include: {
        emotionAnalyses: true,
      },
    });
  }

  /**
   * Retrieve today's entry for a user (UTC day boundary).
   */
  async getTodaysEntry(userId: string) {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    return this.prisma.diaryEntry.findFirst({
      where: {
        userId,
        deletedAt: null,
        createdAt: { gte: start, lt: end },
      },
      orderBy: { createdAt: "desc" },
      include: {
        emotionAnalyses: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  /**
   * Soft-delete a journal entry by ID.
   */
  async deleteEntry(userId: string, entryId: string) {
    const entry = await this.prisma.diaryEntry.findFirst({
      where: { id: entryId, userId, deletedAt: null },
    });

    if (!entry) {
      throw new NotFoundException({
        code: "ENTRY_NOT_FOUND",
        message: `Journal entry with ID ${entryId} not found`,
      });
    }

    return this.prisma.diaryEntry.update({
      where: { id: entryId },
      data: { deletedAt: new Date() },
    });
  }
}
