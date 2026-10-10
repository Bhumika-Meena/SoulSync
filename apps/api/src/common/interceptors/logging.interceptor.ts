import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { Request, Response } from "express";

export interface StructuredHttpLogRecord {
  timestamp: string;
  service: string;
  level: "info" | "warn" | "error";
  correlationId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const method = request.method;
    // Strip query string to ensure sensitive query params are never recorded in logs
    const rawUrl = request.originalUrl || request.url || "";
    const sanitizedPath = rawUrl.split("?")[0];
    const ip = request.ip || request.socket.remoteAddress;
    const userAgent = request.get("user-agent") || "unknown";
    const correlationId =
      request.correlationId ||
      (request.headers["x-correlation-id"] as string) ||
      (request.headers["x-request-id"] as string) ||
      "unknown";
    const startTime = Date.now();

    // Sensitive data protection:
    // Strictly uses an allowlist of non-sensitive metadata fields:
    // timestamp, service, level, correlationId, method, sanitizedPath, statusCode, durationMs, ip, userAgent.
    // Excludes request/response bodies, authorization headers, passwords, JWTs, prompts, journals, and reflections.

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;
          const record: StructuredHttpLogRecord = {
            timestamp: new Date().toISOString(),
            service: "soulsync-api",
            level: statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info",
            correlationId,
            method,
            path: sanitizedPath,
            statusCode,
            durationMs: duration,
            ip,
            userAgent,
          };
          this.logger.log(JSON.stringify(record));
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error?.status || error?.statusCode || 500;
          const record: StructuredHttpLogRecord = {
            timestamp: new Date().toISOString(),
            service: "soulsync-api",
            level: statusCode >= 500 ? "error" : "warn",
            correlationId,
            method,
            path: sanitizedPath,
            statusCode,
            durationMs: duration,
            ip,
            userAgent,
          };
          this.logger.warn(JSON.stringify(record));
        },
      })
    );
  }
}
