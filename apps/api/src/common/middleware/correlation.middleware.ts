import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import * as crypto from "crypto";

const SAFE_CORRELATION_ID_REGEX = /^[a-zA-Z0-9_\-\.]{8,128}$/;

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const rawHeader =
      (req.headers["x-correlation-id"] as string | undefined) ||
      (req.headers["x-request-id"] as string | undefined);

    let correlationId: string;
    if (rawHeader && SAFE_CORRELATION_ID_REGEX.test(rawHeader.trim())) {
      correlationId = rawHeader.trim();
    } else {
      correlationId = crypto.randomUUID();
    }

    req.correlationId = correlationId;
    res.setHeader("x-correlation-id", correlationId);
    res.setHeader("x-request-id", correlationId);

    next();
  }
}
