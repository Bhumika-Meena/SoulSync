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

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const method = request.method;
    const url = request.originalUrl || request.url;
    const ip = request.ip || request.socket.remoteAddress;
    const userAgent = request.get("user-agent") || "unknown";
    const startTime = Date.now();

    // Sensitive data protection:
    // Strictly logs only non-sensitive request metadata: method, path, IP, user-agent, status code, and duration.
    // Avoids passwords, tokens, API keys, request/response bodies, journal content, emotional content, prompts, or model outputs.

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;
          this.logger.log(
            `${method} ${url} ${statusCode} - ${duration}ms [${ip}] "${userAgent}"`
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error?.status || 500;
          this.logger.warn(
            `${method} ${url} ${statusCode} - ${duration}ms [${ip}] "${userAgent}"`
          );
        },
      })
    );
  }
}
