import { z } from "zod";

export const MemorySourceTypeSchema = z.enum([
  "JOURNAL_ENTRY",
  "GOAL",
  "SUMMARY",
]);
export type MemorySourceType = z.infer<typeof MemorySourceTypeSchema>;

export const MemorySearchQuerySchema = z.object({
  query: z.string().min(1, "Search query cannot be empty").max(1000),
  limit: z.coerce.number().int().min(1).max(50).default(5),
  minSimilarity: z.coerce.number().min(0).max(1).default(0.3),
  sourceType: MemorySourceTypeSchema.optional(),
});
export type MemorySearchQueryDTO = z.infer<typeof MemorySearchQuerySchema>;

export const MemorySearchResultSchema = z.object({
  id: z.string(),
  sourceType: MemorySourceTypeSchema,
  sourceId: z.string(),
  content: z.string(),
  similarity: z.number(),
  createdAt: z.union([z.string().datetime(), z.date(), z.string()]),
});
export type MemorySearchResultDTO = z.infer<typeof MemorySearchResultSchema>;

export const CreateMemoryEmbeddingSchema = z.object({
  sourceType: MemorySourceTypeSchema,
  sourceId: z.string().min(1),
  content: z.string().min(1),
  embedding: z.array(z.number()).length(1536).optional(),
});
export type CreateMemoryEmbeddingDTO = z.infer<typeof CreateMemoryEmbeddingSchema>;
