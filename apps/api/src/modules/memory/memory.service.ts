import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { EmbeddingService } from "./embedding.service";
import type {
  MemorySourceType,
  MemorySearchResultDTO,
} from "@soulsync/contracts";

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService
  ) {}

  /**
   * Store or upsert a memory embedding for a user.
   * If vector embedding is not provided, EmbeddingService generates it automatically.
   */
  async store(
    userId: string,
    data: {
      sourceType: MemorySourceType;
      sourceId: string;
      content: string;
      embedding?: number[];
    }
  ): Promise<{ id: string; stored: boolean }> {
    const embedding =
      data.embedding ??
      (await this.embeddingService.generateEmbedding(data.content));

    const vectorString = `[${embedding.join(",")}]`;
    const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // Ensure idempotency: delete previous embedding for the same source
    await this.prisma.$executeRaw`
      DELETE FROM "MemoryEmbedding"
      WHERE "userId" = ${userId}
        AND "sourceType" = ${data.sourceType}::"MemorySourceType"
        AND "sourceId" = ${data.sourceId}
    `;

    // Insert new memory embedding using pgvector vector type cast
    await this.prisma.$executeRaw`
      INSERT INTO "MemoryEmbedding" ("id", "userId", "sourceType", "sourceId", "content", "embedding", "createdAt")
      VALUES (${id}, ${userId}, ${data.sourceType}::"MemorySourceType", ${data.sourceId}, ${data.content}, ${vectorString}::vector, NOW())
    `;

    return { id, stored: true };
  }

  /**
   * Perform semantic vector search across user memories using pgvector HNSW cosine distance (<=>).
   * Strictly enforces user isolation and respects similarity thresholds.
   */
  async search(
    userId: string,
    query: string,
    options?: {
      limit?: number;
      minSimilarity?: number;
      sourceType?: MemorySourceType;
    }
  ): Promise<MemorySearchResultDTO[]> {
    const limit = Math.min(Math.max(options?.limit ?? 5, 1), 50);
    const minSimilarity = options?.minSimilarity ?? 0.3;
    const sourceType = options?.sourceType;

    const queryVector = await this.embeddingService.generateEmbedding(query);
    const vectorString = `[${queryVector.join(",")}]`;

    // Query pgvector using cosine distance operator <=> (1 - distance = cosine similarity)
    const rawResults = await this.prisma.$queryRaw<
      Array<{
        id: string;
        sourceType: MemorySourceType;
        sourceId: string;
        content: string;
        similarity: number;
        createdAt: Date;
      }>
    >`
      SELECT
        id,
        "sourceType",
        "sourceId",
        content,
        (1 - (embedding <=> ${vectorString}::vector))::float AS similarity,
        "createdAt"
      FROM "MemoryEmbedding"
      WHERE "userId" = ${userId}
        AND embedding IS NOT NULL
        ${sourceType ? Prisma.sql`AND "sourceType" = ${sourceType}::"MemorySourceType"` : Prisma.empty}
        AND (1 - (embedding <=> ${vectorString}::vector)) >= ${minSimilarity}
      ORDER BY embedding <=> ${vectorString}::vector ASC
      LIMIT ${limit}
    `;

    return rawResults.map((r) => ({
      id: r.id,
      sourceType: r.sourceType,
      sourceId: r.sourceId,
      content: r.content,
      similarity: Number(r.similarity.toFixed(4)),
      createdAt:
        r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }));
  }

  /**
   * Delete memory embeddings associated with a specific source.
   */
  async deleteBySource(
    userId: string,
    sourceId: string
  ): Promise<{ deleted: number }> {
    const count = await this.prisma.$executeRaw`
      DELETE FROM "MemoryEmbedding"
      WHERE "userId" = ${userId} AND "sourceId" = ${sourceId}
    `;

    return { deleted: Number(count) };
  }
}
