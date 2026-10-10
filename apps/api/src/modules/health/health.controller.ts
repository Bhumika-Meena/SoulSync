import {
  Controller,
  Get,
  HttpStatus,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { Public } from "../../common/decorators/public.decorator";
import { PrismaService } from "../../database/prisma.service";

@Controller(["health", "healthz"])
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lightweight liveness check: verifies process is alive and responsive.
   * Does NOT depend on external infrastructure to prevent spurious container restarts.
   */
  @Public()
  @Get()
  liveness() {
    return {
      status: "ok",
      service: "soulsync-api",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Operational readiness check: verifies required dependencies (PostgreSQL) are accessible.
   * Uses a bounded query (SELECT 1) with strict 3-second timeout.
   * Returns 200 when ready, 503 when degraded. Never exposes database credentials or stack traces.
   */
  @Public()
  @Get("ready")
  async readiness(@Res() res: Response) {
    const timeoutMs = 3000;
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database check timeout")), timeoutMs)
      );

      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        timeoutPromise,
      ]);

      return res.status(HttpStatus.OK).json({
        status: "ready",
        service: "soulsync-api",
        database: "connected",
        timestamp: new Date().toISOString(),
      });
    } catch {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: "not_ready",
        service: "soulsync-api",
        database: "unavailable",
        timestamp: new Date().toISOString(),
      });
    }
  }
}
