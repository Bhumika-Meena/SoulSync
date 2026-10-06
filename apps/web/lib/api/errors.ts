/**
 * Standard client-side API error representation preserving NestJS error envelope metadata.
 */

export interface ApiErrorPayload {
  code?: string;
  message?: string;
  statusCode?: number;
  details?: unknown;
  timestamp?: string;
  path?: string;
}

export class ApiClientError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;
  readonly timestamp?: string;
  readonly path?: string;

  constructor(
    statusCode: number,
    message: string,
    code = "API_ERROR",
    details?: unknown,
    path?: string,
    timestamp?: string
  ) {
    super(message);
    this.name = "ApiClientError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.path = path;
    this.timestamp = timestamp;
  }
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}
