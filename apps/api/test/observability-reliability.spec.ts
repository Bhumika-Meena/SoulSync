import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CorrelationMiddleware } from "../src/common/middleware/correlation.middleware";
import { LoggingInterceptor } from "../src/common/interceptors/logging.interceptor";
import { HealthController } from "../src/modules/health/health.controller";
import { AgentService } from "../src/modules/agent/agent.service";
import type { PrismaService } from "../src/database/prisma.service";
import type { ConfigService } from "@nestjs/config";
import type { EnvironmentVariables } from "../src/common/config/env.schema";
import { of, throwError } from "rxjs";

describe("Phase 10 API Observability & Reliability Suite", () => {
  describe("CorrelationMiddleware", () => {
    const middleware = new CorrelationMiddleware();

    it("generates a new UUID correlation ID when none is provided", () => {
      const headers: Record<string, string> = {};
      const req: any = { headers };
      const resHeaders: Record<string, string> = {};
      const res: any = {
        setHeader: (key: string, val: string) => {
          resHeaders[key.toLowerCase()] = val;
        },
      };

      let calledNext = false;
      middleware.use(req, res, () => {
        calledNext = true;
      });

      assert.ok(calledNext);
      assert.ok(req.correlationId);
      assert.equal(typeof req.correlationId, "string");
      assert.ok(req.correlationId.length >= 16);
      assert.equal(resHeaders["x-correlation-id"], req.correlationId);
      assert.equal(resHeaders["x-request-id"], req.correlationId);
    });

    it("preserves valid incoming x-correlation-id", () => {
      const validId = "corr_client-run-9876543210";
      const req: any = {
        headers: { "x-correlation-id": validId },
      };
      const resHeaders: Record<string, string> = {};
      const res: any = {
        setHeader: (key: string, val: string) => {
          resHeaders[key.toLowerCase()] = val;
        },
      };

      middleware.use(req, res, () => {});

      assert.equal(req.correlationId, validId);
      assert.equal(resHeaders["x-correlation-id"], validId);
      assert.equal(resHeaders["x-request-id"], validId);
    });

    it("sanitizes and replaces invalid or malformed correlation IDs", () => {
      const malformedId = "bad id with spaces & <script>";
      const req: any = {
        headers: { "x-correlation-id": malformedId },
      };
      const resHeaders: Record<string, string> = {};
      const res: any = {
        setHeader: (key: string, val: string) => {
          resHeaders[key.toLowerCase()] = val;
        },
      };

      middleware.use(req, res, () => {});

      assert.notEqual(req.correlationId, malformedId);
      assert.ok(!req.correlationId.includes(" "));
      assert.ok(!req.correlationId.includes("<"));
      assert.equal(resHeaders["x-correlation-id"], req.correlationId);
    });
  });

  describe("LoggingInterceptor Structured JSON & Privacy", () => {
    it("logs structured JSON with allowlisted fields on successful request", () => {
      const interceptor = new LoggingInterceptor();
      const logs: string[] = [];
      (interceptor as any).logger = {
        log: (msg: string) => logs.push(msg),
        warn: (msg: string) => logs.push(msg),
      };

      const req: any = {
        method: "GET",
        originalUrl: "/api/v1/journal?token=secret123&query=personal_mood",
        correlationId: "corr_test_001",
        ip: "127.0.0.1",
        headers: {},
        get: () => "TestAgent/1.0",
      };
      const res: any = { statusCode: 200 };
      const context: any = {
        switchToHttp: () => ({
          getRequest: () => req,
          getResponse: () => res,
        }),
      };
      const handler: any = {
        handle: () => of({ data: "result" }),
      };

      interceptor.intercept(context, handler).subscribe();

      assert.equal(logs.length, 1);
      const logObj = JSON.parse(logs[0]);
      assert.equal(logObj.service, "soulsync-api");
      assert.equal(logObj.level, "info");
      assert.equal(logObj.correlationId, "corr_test_001");
      assert.equal(logObj.method, "GET");
      // Critical privacy check: query string stripped from path
      assert.equal(logObj.path, "/api/v1/journal");
      assert.ok(!JSON.stringify(logObj).includes("secret123"));
      assert.ok(!JSON.stringify(logObj).includes("personal_mood"));
      assert.equal(logObj.statusCode, 200);
      assert.ok(typeof logObj.durationMs === "number");
    });
  });

  describe("Health & Readiness Probes", () => {
    it("liveness returns 200 ok without database dependency", () => {
      const mockPrisma: any = {};
      const controller = new HealthController(mockPrisma);

      const result = controller.liveness();
      assert.equal(result.status, "ok");
      assert.equal(result.service, "soulsync-api");
      assert.ok(result.timestamp);
    });

    it("readiness returns 200 ready when database check succeeds", async () => {
      const mockPrisma: any = {
        $queryRaw: async () => [{ 1: 1 }],
      };
      const controller = new HealthController(mockPrisma);

      let statusCode = 0;
      let responseBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (body: any) => {
              responseBody = body;
            },
          };
        },
      };

      await controller.readiness(res);

      assert.equal(statusCode, 200);
      assert.equal(responseBody.status, "ready");
      assert.equal(responseBody.database, "connected");
      assert.equal(responseBody.service, "soulsync-api");
    });

    it("readiness returns 503 unavailable when database is down without leaking stack traces", async () => {
      const mockPrisma: any = {
        $queryRaw: async () => {
          throw new Error("FATAL: connection to server at postgresql://user:pass@internal-db:5432 failed");
        },
      };
      const controller = new HealthController(mockPrisma);

      let statusCode = 0;
      let responseBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (body: any) => {
              responseBody = body;
            },
          };
        },
      };

      await controller.readiness(res);

      assert.equal(statusCode, 503);
      assert.equal(responseBody.status, "not_ready");
      assert.equal(responseBody.database, "unavailable");
      // Zero secrets or connection URLs leaked
      assert.ok(!JSON.stringify(responseBody).includes("postgresql"));
      assert.ok(!JSON.stringify(responseBody).includes("pass"));
    });
  });

  describe("AgentService Streaming Timeouts & Correlation Propagation", () => {
    it("signInternalPayload attaches x-correlation-id and x-request-id when provided", () => {
      const mockPrisma: any = {};
      const mockConfig: any = {
        get: (key: string) => {
          if (key === "INTERNAL_AGENT_SECRET") return "test-secret-at-least-32-chars-long-12345";
          return "";
        },
      };
      const service = new AgentService(mockPrisma, mockConfig);

      const { headers } = (service as any).signInternalPayload(
        { userId: "u1", message: "hi" },
        "corr_custom_999"
      );

      assert.equal(headers["x-correlation-id"], "corr_custom_999");
      assert.equal(headers["x-request-id"], "corr_custom_999");
      assert.ok(headers["x-internal-signature"]);
      assert.ok(headers["x-internal-timestamp"]);
    });

    it("chatStream does not write to response if writableEnded is true", async () => {
      const mockPrisma: any = {
        conversationThread: {
          findFirst: async () => ({ id: "th_1", userId: "u1" }),
          create: async () => ({ id: "th_1", userId: "u1" }),
        },
        threadMessage: {
          create: async () => ({ id: "m_1" }),
        },
      };
      const mockConfig: any = {
        get: () => "http://127.0.0.1:9999",
      };
      const service = new AgentService(mockPrisma, mockConfig);

      const written: string[] = [];
      const res: any = {
        writableEnded: true,
        setHeader: () => {},
        flushHeaders: () => {},
        write: (chunk: string) => written.push(chunk),
        end: () => {},
      };

      await service.chatStream("u1", "test message", res, "th_1", "corr_ended_test");

      // Because writableEnded was true, write must not be called
      assert.equal(written.length, 0);
    });
  });
});
