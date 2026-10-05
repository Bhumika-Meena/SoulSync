import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import type { ApiErrorResponseDTO } from "@soulsync/contracts";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    let code = "INTERNAL_SERVER_ERROR";
    let message = "An unexpected error occurred";
    let details: unknown = undefined;

    if (isHttpException) {
      const res = exception.getResponse();
      if (typeof res === "string") {
        message = res;
        code = this.getErrorCodeFromStatus(statusCode);
      } else if (typeof res === "object" && res !== null) {
        const resObj = res as Record<string, unknown>;
        message = (resObj["message"] as string) || exception.message;
        code = (resObj["code"] as string) || this.getErrorCodeFromStatus(statusCode);
        details = resObj["details"] || resObj["errors"] || undefined;
      }
    } else {
      this.logger.error(
        `Unhandled exception on ${request?.method ?? "UNKNOWN"} ${request?.url ?? "UNKNOWN"}`,
        exception instanceof Error ? exception.stack : String(exception)
      );
    }

    const errorBody: ApiErrorResponseDTO = {
      success: false,
      error: {
        code,
        message: Array.isArray(message) ? message.join(", ") : String(message),
        details,
        statusCode,
        timestamp: new Date().toISOString(),
        path: request?.url,
      },
    };

    response.status(statusCode).json(errorBody);
  }

  private getErrorCodeFromStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return "BAD_REQUEST";
      case HttpStatus.UNAUTHORIZED:
        return "UNAUTHORIZED";
      case HttpStatus.FORBIDDEN:
        return "FORBIDDEN";
      case HttpStatus.NOT_FOUND:
        return "NOT_FOUND";
      case HttpStatus.CONFLICT:
        return "CONFLICT";
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return "UNPROCESSABLE_ENTITY";
      case HttpStatus.TOO_MANY_REQUESTS:
        return "TOO_MANY_REQUESTS";
      default:
        return status >= 500 ? "INTERNAL_SERVER_ERROR" : "HTTP_ERROR";
    }
  }
}
