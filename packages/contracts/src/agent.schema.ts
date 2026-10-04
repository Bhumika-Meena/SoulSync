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
