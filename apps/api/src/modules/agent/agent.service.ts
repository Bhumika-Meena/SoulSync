import {
  Injectable,
  NotFoundException,
  Logger,
  BadGatewayException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../database/prisma.service";
import * as crypto from "crypto";
import type { Response } from "express";
import type { EnvironmentVariables } from "../../common/config/env.schema";

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<EnvironmentVariables, true>
  ) {}

  /**
   * Find an existing thread owned by user or create a new one.
   */
  async getOrCreateThread(userId: string, threadId?: string) {
    if (threadId) {
      const thread = await this.prisma.conversationThread.findFirst({
        where: { id: threadId, userId, deletedAt: null },
      });
      if (!thread) {
        throw new NotFoundException({
          code: "THREAD_NOT_FOUND",
          message: `Conversation thread ${threadId} not found`,
        });
      }
      return thread;
    }

    return this.prisma.conversationThread.create({
      data: {
        userId,
        title: "Wellness Reflection",
        status: "ACTIVE",
      },
    });
  }

  /**
   * Save a message into a conversation thread.
   */
  async saveMessage(
    threadId: string,
    role: "user" | "assistant" | "tool",
    content: string,
    metadata?: Record<string, unknown>
  ) {
    return this.prisma.threadMessage.create({
      data: {
        threadId,
        role,
        content,
        metadata: metadata ? (metadata as any) : undefined,
      },
    });
  }

  /**
   * List conversation threads for a user.
   */
  async listThreads(userId: string) {
    return this.prisma.conversationThread.findMany({
      where: { userId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  /**
   * List messages in a conversation thread.
   */
  async listMessages(userId: string, threadId: string) {
    await this.getOrCreateThread(userId, threadId);
    return this.prisma.threadMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Signs an internal payload using HMAC-SHA256 and returns headers and body string.
   */
  private signInternalPayload(body: Record<string, unknown>, correlationId?: string) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const secret = this.configService.get("INTERNAL_AGENT_SECRET", { infer: true });
    // Compact JSON serialization
    const bodyStr = JSON.stringify(body);
    const signature = crypto
      .createHmac("sha256", secret)
      .update(`${timestamp}${bodyStr}`)
      .digest("hex");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-internal-signature": signature,
      "x-internal-timestamp": timestamp,
    };

    if (correlationId) {
      headers["x-correlation-id"] = correlationId;
      headers["x-request-id"] = correlationId;
    }

    return {
      bodyStr,
      headers,
    };
  }

  /**
   * Stream agent execution via Python service and proxy SSE chunks to the client.
   * Persists user and assistant messages in PostgreSQL.
   */
  async chatStream(
    userId: string,
    message: string,
    res: Response,
    threadId?: string,
    correlationId?: string
  ) {
    const thread = await this.getOrCreateThread(userId, threadId);
    const activeThreadId = thread.id;
    const activeCorrelationId = correlationId || crypto.randomUUID();

    // Persist user prompt
    await this.saveMessage(activeThreadId, "user", message);

    // Setup SSE response headers and correlation headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("x-correlation-id", activeCorrelationId);
    res.setHeader("x-request-id", activeCorrelationId);
    res.flushHeaders?.();

    const agentUrl = this.configService.get("AGENT_SERVICE_URL", { infer: true });
    const { bodyStr, headers } = this.signInternalPayload(
      {
        userId,
        threadId: activeThreadId,
        message,
      },
      activeCorrelationId
    );

    const abortController = new AbortController();
    const onClientClose = () => {
      if (!abortController.signal.aborted) {
        abortController.abort();
        this.logger.log(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            service: "soulsync-api",
            operation: "agent.chatStream",
            correlationId: activeCorrelationId,
            threadId: activeThreadId,
            event: "client_disconnected",
          })
        );
      }
    };
    if (typeof res.on === "function") {
      res.on("close", onClientClose);
    }

    // Bounded connection setup timeout (15s) for initial upstream handshake
    const connectTimeout = setTimeout(() => {
      if (!abortController.signal.aborted) {
        abortController.abort(new Error("AGENT_GATEWAY_TIMEOUT"));
      }
    }, 15000);

    let accumulatedText = "";
    try {
      this.logger.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          service: "soulsync-api",
          operation: "agent.chatStream",
          correlationId: activeCorrelationId,
          threadId: activeThreadId,
          event: "started",
        })
      );

      const response = await fetch(`${agentUrl}/internal/v1/agent/run`, {
        method: "POST",
        headers,
        body: bodyStr,
        signal: abortController.signal,
      });

      clearTimeout(connectTimeout);

      if (!response.ok || !response.body) {
        throw new BadGatewayException(`Agent service error: HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        if (abortController.signal.aborted) {
          await reader.cancel();
          break;
        }

        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        if (!res.writableEnded) {
          res.write(text);
        }

        // Inspect SSE data to accumulate response text for persistence
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) accumulatedText += data.text;
              if (data.response) accumulatedText = data.response;
            } catch {
              // Ignore non-json or incomplete chunks
            }
          }
        }
      }

      // Persist assistant message upon turn completion if not aborted
      if (!abortController.signal.aborted && accumulatedText.trim().length > 0) {
        await this.saveMessage(activeThreadId, "assistant", accumulatedText.trim());
      }

      this.logger.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          service: "soulsync-api",
          operation: "agent.chatStream",
          correlationId: activeCorrelationId,
          threadId: activeThreadId,
          event: "completed",
          responseLength: accumulatedText.trim().length,
        })
      );
    } catch (err: any) {
      clearTimeout(connectTimeout);
      const isAbort = abortController.signal.aborted || err?.name === "AbortError";
      if (!isAbort) {
        this.logger.error(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            service: "soulsync-api",
            operation: "agent.chatStream",
            correlationId: activeCorrelationId,
            threadId: activeThreadId,
            event: "error",
            errorName: err?.name || "Error",
            message: err?.message?.slice(0, 200) || "Unknown error",
          })
        );
        if (!res.writableEnded) {
          const errorEvent = `event: agent.error\ndata: ${JSON.stringify({
            code: "UPSTREAM_AGENT_ERROR",
            message: "An error occurred while connecting to the companion agent.",
          })}\n\n`;
          res.write(errorEvent);
        }
      }
    } finally {
      clearTimeout(connectTimeout);
      if (typeof res.removeListener === "function") {
        res.removeListener("close", onClientClose);
      }
      if (!res.writableEnded) {
        res.end();
      }
    }
  }

  /**
   * Resumes execution after human approval for mutating actions.
   */
  async approveStream(
    userId: string,
    actionId: string,
    approved: boolean,
    res: Response,
    threadId: string,
    modifiedPayload?: Record<string, unknown>,
    correlationId?: string
  ) {
    const thread = await this.getOrCreateThread(userId, threadId);
    const activeThreadId = thread.id;
    const activeCorrelationId = correlationId || crypto.randomUUID();

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("x-correlation-id", activeCorrelationId);
    res.setHeader("x-request-id", activeCorrelationId);
    res.flushHeaders?.();

    const agentUrl = this.configService.get("AGENT_SERVICE_URL", { infer: true });
    const { bodyStr, headers } = this.signInternalPayload(
      {
        userId,
        threadId: activeThreadId,
        actionId,
        approved,
        modifiedPayload,
      },
      activeCorrelationId
    );

    const abortController = new AbortController();
    const onClientClose = () => {
      if (!abortController.signal.aborted) {
        abortController.abort();
        this.logger.log(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            service: "soulsync-api",
            operation: "agent.approveStream",
            correlationId: activeCorrelationId,
            threadId: activeThreadId,
            event: "client_disconnected",
          })
        );
      }
    };
    if (typeof res.on === "function") {
      res.on("close", onClientClose);
    }

    const connectTimeout = setTimeout(() => {
      if (!abortController.signal.aborted) {
        abortController.abort(new Error("AGENT_GATEWAY_TIMEOUT"));
      }
    }, 15000);

    let accumulatedText = "";
    try {
      this.logger.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          service: "soulsync-api",
          operation: "agent.approveStream",
          correlationId: activeCorrelationId,
          threadId: activeThreadId,
          event: "started",
        })
      );

      const response = await fetch(`${agentUrl}/internal/v1/agent/resume`, {
        method: "POST",
        headers,
        body: bodyStr,
        signal: abortController.signal,
      });

      clearTimeout(connectTimeout);

      if (!response.ok || !response.body) {
        throw new BadGatewayException(`Agent service error: HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        if (abortController.signal.aborted) {
          await reader.cancel();
          break;
        }

        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        if (!res.writableEnded) {
          res.write(text);
        }

        const lines = text.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) accumulatedText += data.text;
              if (data.response) accumulatedText = data.response;
            } catch {
              // Ignore non-json chunks
            }
          }
        }
      }

      if (!abortController.signal.aborted && accumulatedText.trim().length > 0) {
        await this.saveMessage(activeThreadId, "assistant", accumulatedText.trim());
      }

      this.logger.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          service: "soulsync-api",
          operation: "agent.approveStream",
          correlationId: activeCorrelationId,
          threadId: activeThreadId,
          event: "completed",
          responseLength: accumulatedText.trim().length,
        })
      );
    } catch (err: any) {
      clearTimeout(connectTimeout);
      const isAbort = abortController.signal.aborted || err?.name === "AbortError";
      if (!isAbort) {
        this.logger.error(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            service: "soulsync-api",
            operation: "agent.approveStream",
            correlationId: activeCorrelationId,
            threadId: activeThreadId,
            event: "error",
            errorName: err?.name || "Error",
            message: err?.message?.slice(0, 200) || "Unknown error",
          })
        );
        if (!res.writableEnded) {
          const errorEvent = `event: agent.error\ndata: ${JSON.stringify({
            code: "UPSTREAM_AGENT_ERROR",
            message: "An error occurred while resuming agent action.",
          })}\n\n`;
          res.write(errorEvent);
        }
      }
    } finally {
      clearTimeout(connectTimeout);
      if (typeof res.removeListener === "function") {
        res.removeListener("close", onClientClose);
      }
      if (!res.writableEnded) {
        res.end();
      }
    }
  }
}
