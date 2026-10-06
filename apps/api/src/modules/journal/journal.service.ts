import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { MemoryService } from "../memory/memory.service";
import type { Prisma } from "@prisma/client";
import type {
  CreateJournalEntryDTO,
  JournalQueryDTO,
} from "@soulsync/contracts";

@Injectable()
export class JournalService {
  private readonly logger = new Logger(JournalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly memoryService: MemoryService
  ) {}

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
      ...(query?.startDate
        ? {
            createdAt: {
              gte: new Date(query.startDate),
            },
          }
        : {}),
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
   * Automatically ingests plain reflection text into semantic memory.
   */
  async createEntry(userId: string, dto: CreateJournalEntryDTO) {
    const contentJson = dto.contentJson
      ? (dto.contentJson as Prisma.InputJsonValue)
      : undefined;

    const entry = await this.prisma.diaryEntry.create({
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

    // Automated Memory Ingestion:
    // Extract plain reflection text and generate/persist pgvector memory embedding
    const reflectionText = dto.plainText ?? dto.content;
    if (reflectionText && reflectionText.trim().length > 0) {
      await this.memoryService
        .store(userId, {
          sourceType: "JOURNAL_ENTRY",
          sourceId: entry.id,
          content: reflectionText.trim(),
        })
        .catch((err) => {
          this.logger.warn(
            `Failed to auto-ingest memory embedding for journal ${entry.id}: ${err}`
          );
        });
    }

    return entry;
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
   * Automatically purges associated memory embeddings.
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

    // Purge memory embedding for deleted entry
    await this.memoryService
      .deleteBySource(userId, entryId)
      .catch((err) => {
        this.logger.warn(
          `Failed to purge memory embedding for deleted journal ${entryId}: ${err}`
        );
      });

    return this.prisma.diaryEntry.update({
      where: { id: entryId },
      data: { deletedAt: new Date() },
    });
  }
}
