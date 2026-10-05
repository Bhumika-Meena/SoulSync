import { z } from "zod";

export const GoalStatusSchema = z.enum([
  "PENDING_APPROVAL",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
]);

export type GoalStatus = z.infer<typeof GoalStatusSchema>;

export const CreateWellnessGoalSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  targetDate: z.union([z.string().datetime(), z.date(), z.string()]).optional(),
  status: GoalStatusSchema.optional().default("PENDING_APPROVAL"),
});

export type CreateWellnessGoalDTO = z.infer<typeof CreateWellnessGoalSchema>;

export const UpdateWellnessGoalSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  targetDate: z.union([z.string().datetime(), z.date(), z.string()]).nullable().optional(),
  status: GoalStatusSchema.optional(),
});

export type UpdateWellnessGoalDTO = z.infer<typeof UpdateWellnessGoalSchema>;

export const WellnessGoalResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  targetDate: z.union([z.string().datetime(), z.date(), z.string()]).nullable().optional(),
  status: GoalStatusSchema,
  createdAt: z.union([z.string().datetime(), z.date(), z.string()]),
  updatedAt: z.union([z.string().datetime(), z.date(), z.string()]),
});

export type WellnessGoalResponseDTO = z.infer<typeof WellnessGoalResponseSchema>;
