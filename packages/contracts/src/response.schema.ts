import { z } from "zod";

/**
 * Standard API error response schema
 */
export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    statusCode: z.number().int(),
    timestamp: z.string(),
    path: z.string().optional(),
    requestId: z.string().optional(),
  }),
});

export type ApiErrorResponseDTO = z.infer<typeof ApiErrorResponseSchema>;

/**
 * Standard API success response envelope generator
 */
export function createApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: z.record(z.unknown()).optional(),
  });
}

export type ApiResponseDTO<T> = {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
};

/**
 * Standard pagination query parameters schema
 */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQueryDTO = z.infer<typeof PaginationQuerySchema>;

/**
 * Pagination metadata schema
 */
export const PaginationMetaSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export type PaginationMetaDTO = z.infer<typeof PaginationMetaSchema>;

/**
 * Standard paginated response envelope generator
 */
export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    pagination: PaginationMetaSchema,
  });
}

export type PaginatedResponseDTO<T> = {
  success: true;
  data: T[];
  pagination: PaginationMetaDTO;
};
