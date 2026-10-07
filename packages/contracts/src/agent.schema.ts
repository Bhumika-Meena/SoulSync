import { z } from "zod";

export const AgentChatRequestSchema = z.object({
  threadId: z.string().optional(),
  message: z.string().min(1).max(4000),
});

export type AgentChatRequestDTO = z.infer<typeof AgentChatRequestSchema>;

export const AgentApprovalRequestSchema = z.object({
  actionId: z.string(),
  approved: z.boolean(),
  modifiedPayload: z.record(z.unknown()).optional(),
  threadId: z.string().optional(),
});

export type AgentApprovalRequestDTO = z.infer<typeof AgentApprovalRequestSchema>;

export const AgentStreamEventTypeSchema = z.enum([
  "agent.started",
  "tool.started",
  "tool.completed",
  "approval.required",
  "content.delta",
  "agent.completed",
  "agent.error",
]);

export type AgentStreamEventType = z.infer<typeof AgentStreamEventTypeSchema>;

export const InternalToolNameSchema = z.enum([
  "get_recent_journal_entries",
  "get_emotion_trends",
  "search_memory",
  "create_wellness_goal",
]);
export type InternalToolName = z.infer<typeof InternalToolNameSchema>;

export const InternalToolExecutionRequestSchema = z.object({
  tool: InternalToolNameSchema,
  userId: z.string().min(1, "userId is required"),
  payload: z.record(z.unknown()).default({}),
});
export type InternalToolExecutionRequestDTO = z.infer<typeof InternalToolExecutionRequestSchema>;

export const InternalToolExecutionResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
});
export type InternalToolExecutionResponseDTO = z.infer<typeof InternalToolExecutionResponseSchema>;

export const AgentEventPayloadSchema = z.object({
  type: AgentStreamEventTypeSchema,
  data: z.union([z.record(z.unknown()), z.string()]),
});
export type AgentEventPayloadDTO = z.infer<typeof AgentEventPayloadSchema>;
