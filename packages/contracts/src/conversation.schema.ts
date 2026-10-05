import { z } from "zod";

export const ThreadStatusSchema = z.enum(["ACTIVE", "ARCHIVED"]);
export type ThreadStatus = z.infer<typeof ThreadStatusSchema>;

export const MessageRoleSchema = z.enum(["user", "assistant", "tool"]);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

export const CreateConversationThreadSchema = z.object({
  title: z.string().max(200).optional(),
});
export type CreateConversationThreadDTO = z.infer<typeof CreateConversationThreadSchema>;

export const ConversationThreadResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().nullable().optional(),
  status: ThreadStatusSchema,
  createdAt: z.union([z.string().datetime(), z.date(), z.string()]),
  updatedAt: z.union([z.string().datetime(), z.date(), z.string()]),
  deletedAt: z.union([z.string().datetime(), z.date(), z.string()]).nullable().optional(),
});
export type ConversationThreadResponseDTO = z.infer<typeof ConversationThreadResponseSchema>;

export const CreateThreadMessageSchema = z.object({
  role: MessageRoleSchema,
  content: z.string().min(1, "Message content cannot be empty"),
  metadata: z.record(z.unknown()).optional(),
});
export type CreateThreadMessageDTO = z.infer<typeof CreateThreadMessageSchema>;

export const ThreadMessageResponseSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  role: MessageRoleSchema,
  content: z.string(),
  metadata: z.record(z.unknown()).nullable().optional(),
  createdAt: z.union([z.string().datetime(), z.date(), z.string()]),
});
export type ThreadMessageResponseDTO = z.infer<typeof ThreadMessageResponseSchema>;
