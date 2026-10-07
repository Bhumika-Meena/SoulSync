import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import type { Request } from "express";

@Injectable()
export class InternalHmacGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { rawBody?: Buffer }>();
    const signature = request.headers["x-internal-signature"] as string | undefined;
    const timestampStr = request.headers["x-internal-timestamp"] as string | undefined;

    if (!signature || !timestampStr) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED_INTERNAL_CALL",
        message: "Missing x-internal-signature or x-internal-timestamp header",
      });
    }

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) {
      throw new UnauthorizedException({
        code: "INVALID_INTERNAL_TIMESTAMP",
        message: "x-internal-timestamp must be a valid integer unix timestamp",
      });
    }

    const now = Math.floor(Date.now() / 1000);
    // Enforce 300-second (5 minute) window to protect against replay attacks
    if (Math.abs(now - timestamp) > 300) {
      throw new UnauthorizedException({
        code: "EXPIRED_INTERNAL_REQUEST",
        message: "Internal request timestamp expired or outside acceptable replay window",
      });
    }

    const secret = this.configService.get<string>("INTERNAL_AGENT_SECRET");
    if (!secret) {
      throw new ForbiddenException({
        code: "INTERNAL_SECRET_NOT_CONFIGURED",
        message: "INTERNAL_AGENT_SECRET is not configured on server",
      });
    }

    // Use rawBody buffer if available; otherwise format JSON payload string
    const bodyContent = request.rawBody
      ? request.rawBody.toString("utf8")
      : typeof request.body === "string"
      ? request.body
      : JSON.stringify(request.body ?? {});

    const payloadToSign = `${timestampStr}${bodyContent}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payloadToSign)
      .digest("hex");

    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException({
        code: "INVALID_INTERNAL_SIGNATURE",
        message: "HMAC signature verification failed",
      });
    }

    return true;
  }
}
