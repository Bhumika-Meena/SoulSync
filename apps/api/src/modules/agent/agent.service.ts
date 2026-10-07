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
  private signInternalPayload(body: Record<string, unknown>) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const secret = this.configService.get("INTERNAL_AGENT_SECRET", { infer: true });
    // Compact JSON serialization
    const bodyStr = JSON.stringify(body);
    const signature = crypto
      .createHmac("sha256", secret)
      .update(`${timestamp}${bodyStr}`)
      .digest("hex");

    return {
      bodyStr,
      headers: {
        "Content-Type": "application/json",
        "x-internal-signature": signature,
        "x-internal-timestamp": timestamp,
      },
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
    threadId?: string
  ) {
    const thread = await this.getOrCreateThread(userId, threadId);
    const activeThreadId = thread.id;

    // Persist user prompt
    await this.saveMessage(activeThreadId, "user", message);

    // Setup SSE response headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const agentUrl = this.configService.get("AGENT_SERVICE_URL", { infer: true });
    const { bodyStr, headers } = this.signInternalPayload({
      userId,
      threadId: activeThreadId,
      message,
    });

    let accumulatedText = "";
    try {
      const response = await fetch(`${agentUrl}/internal/v1/agent/run`, {
        method: "POST",
        headers,
        body: bodyStr,
      });

      if (!response.ok || !response.body) {
        throw new BadGatewayException(`Agent service error: HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        res.write(text);

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

      // Persist assistant message upon turn completion
      if (accumulatedText.trim().length > 0) {
        await this.saveMessage(activeThreadId, "assistant", accumulatedText.trim());
      }
    } catch (err: any) {
      this.logger.error(`Error streaming agent response: ${err.message}`, err.stack);
      const errorEvent = `event: agent.error\ndata: ${JSON.stringify({ message: "An error occurred while connecting to the companion agent." })}\n\n`;
      res.write(errorEvent);
    } finally {
      res.end();
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
    modifiedPayload?: Record<string, unknown>
  ) {
    const thread = await this.getOrCreateThread(userId, threadId);
    const activeThreadId = thread.id;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const agentUrl = this.configService.get("AGENT_SERVICE_URL", { infer: true });
    const { bodyStr, headers } = this.signInternalPayload({
      userId,
      threadId: activeThreadId,
      actionId,
      approved,
      modifiedPayload,
    });

    let accumulatedText = "";
    try {
      const response = await fetch(`${agentUrl}/internal/v1/agent/resume`, {
        method: "POST",
        headers,
        body: bodyStr,
      });

      if (!response.ok || !response.body) {
        throw new BadGatewayException(`Agent service error: HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        res.write(text);

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

      if (accumulatedText.trim().length > 0) {
        await this.saveMessage(activeThreadId, "assistant", accumulatedText.trim());
      }
    } catch (err: any) {
      this.logger.error(`Error in approve stream: ${err.message}`, err.stack);
      const errorEvent = `event: agent.error\ndata: ${JSON.stringify({ message: "An error occurred while resuming agent action." })}\n\n`;
      res.write(errorEvent);
    } finally {
      res.end();
    }
  }
}
