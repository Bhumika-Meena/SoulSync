import test from "node:test";
import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import { AgentService } from "../src/modules/agent/agent.service";
import { NotFoundException } from "@nestjs/common";

function createMockPrismaService() {
  const threads: any[] = [];
  const messages: any[] = [];

  return {
    conversationThread: {
      findFirst: async (args: any) => {
        return (
          threads.find((t) => {
            if (args.where.id && t.id !== args.where.id) return false;
            if (args.where.userId && t.userId !== args.where.userId) return false;
            if (args.where.deletedAt === null && t.deletedAt !== null) return false;
            return true;
          }) || null
        );
      },
      create: async (args: any) => {
        const thread = {
          id: `thread-${Date.now()}`,
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };
        threads.push(thread);
        return thread;
      },
      findMany: async (args: any) => {
        return threads.filter((t) => t.userId === args.where.userId && t.deletedAt === null);
      },
    },
    threadMessage: {
      create: async (args: any) => {
        const msg = {
          id: `msg-${Date.now()}`,
          ...args.data,
          createdAt: new Date(),
        };
        messages.push(msg);
        return msg;
      },
      findMany: async (args: any) => {
        return messages.filter((m) => m.threadId === args.where.threadId);
      },
    },
    getThreads: () => threads,
    getMessages: () => messages,
  } as any;
}

function createMockConfigService(secret = "test-agent-secret-32-chars-long!", agentUrl = "http://127.0.0.1:8000") {
  return {
    get: (key: string) => {
      if (key === "INTERNAL_AGENT_SECRET") return secret;
      if (key === "AGENT_SERVICE_URL") return agentUrl;
      return null;
    },
  } as any;
}

test("AgentService: getOrCreateThread creates new thread when no threadId provided", async () => {
  const prisma = createMockPrismaService();
  const config = createMockConfigService();
  const service = new AgentService(prisma, config);

  const thread = await service.getOrCreateThread("user-1");
  assert.ok(thread.id);
  assert.equal(thread.userId, "user-1");
  assert.equal(thread.title, "Wellness Reflection");
});

test("AgentService: getOrCreateThread enforces tenant isolation for existing threads", async () => {
  const prisma = createMockPrismaService();
  const config = createMockConfigService();
  const service = new AgentService(prisma, config);

  // User 1 creates thread
  const thread = await service.getOrCreateThread("user-1");

  // User 2 attempts to access User 1's threadId
  await assert.rejects(
    () => service.getOrCreateThread("user-2", thread.id),
    (err: any) => {
      assert.ok(err instanceof NotFoundException);
      assert.equal(err.getResponse().code, "THREAD_NOT_FOUND");
      return true;
    }
  );
});

test("AgentService: saveMessage persists user and assistant messages", async () => {
  const prisma = createMockPrismaService();
  const config = createMockConfigService();
  const service = new AgentService(prisma, config);

  const thread = await service.getOrCreateThread("user-1");
  const msg = await service.saveMessage(thread.id, "user", "I am feeling peaceful today");

  assert.equal(msg.threadId, thread.id);
  assert.equal(msg.role, "user");
  assert.equal(msg.content, "I am feeling peaceful today");
});

test("AgentService: chatStream handles upstream agent failure with controlled SSE error event", async () => {
  const prisma = createMockPrismaService();
  // Provide unresolvable URL to trigger upstream error
  const config = createMockConfigService("test-secret", "http://127.0.0.1:9999");
  const service = new AgentService(prisma, config);

  const writtenChunks: string[] = [];
  const mockResponse: any = {
    setHeader: () => {},
    flushHeaders: () => {},
    write: (chunk: string) => writtenChunks.push(chunk),
    end: () => {},
  };

  await service.chatStream("user-1", "Hello companion", mockResponse);

  const fullOutput = writtenChunks.join("");
  // Should emit agent.error SSE event
  assert.ok(fullOutput.includes("event: agent.error"));
  assert.ok(fullOutput.includes("An error occurred while connecting to the companion agent"));
});
