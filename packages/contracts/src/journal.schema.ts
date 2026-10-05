import { z } from "zod";

/**
 * Create Journal Entry contract.
 * Transitional: accommodates legacy schema (content, htmlContent, backgroundImage)
 * while allowing forward-compatible rich-text extensions without forcing them.
 */
export const CreateJournalEntrySchema = z.object({
  content: z.string().min(1, "Content cannot be empty").max(50000),
  htmlContent: z.string().nullable().optional(),
  backgroundImage: z.string().nullable().optional(),
  // Forward-compatible optional fields:
  contentJson: z.record(z.unknown()).optional().describe("TipTap ProseMirror JSON document tree"),
  plainText: z.string().max(50000).optional(),
  assetUrl: z.string().url().nullable().optional(),
});

export type CreateJournalEntryDTO = z.infer<typeof CreateJournalEntrySchema>;

/**
 * Journal Entry Response contract matching the current database structure.
 */
export const JournalEntryResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  content: z.string(),
  htmlContent: z.string().nullable().optional(),
  backgroundImage: z.string().nullable().optional(),
  // Forward-compatible optional fields:
  contentJson: z.record(z.unknown()).nullable().optional(),
  plainText: z.string().optional(),
  assetUrl: z.string().nullable().optional(),
  createdAt: z.union([z.string().datetime(), z.date(), z.string()]),
});

export type JournalEntryResponseDTO = z.infer<typeof JournalEntryResponseSchema>;

/**
 * Query schema for listing journal entries.
 */
export const JournalQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().max(200).optional(),
});

export type JournalQueryDTO = z.infer<typeof JournalQuerySchema>;
