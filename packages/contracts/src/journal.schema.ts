import { z } from "zod";

export const CreateJournalEntrySchema = z.object({
  contentJson: z.record(z.unknown()).describe("TipTap ProseMirror JSON document tree"),
  plainText: z.string().min(1, "Entry cannot be empty").max(50000),
  assetUrl: z.string().url().nullable().optional(),
});

export type CreateJournalEntryDTO = z.infer<typeof CreateJournalEntrySchema>;

export const JournalEntryResponseSchema = z.object({
  id: z.string().uuid().or(z.string()),
  userId: z.string(),
  contentJson: z.record(z.unknown()).nullable(),
  plainText: z.string(),
  assetUrl: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
});

export type JournalEntryResponseDTO = z.infer<typeof JournalEntryResponseSchema>;
