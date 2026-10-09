import test from "node:test";
import assert from "node:assert/strict";
import { InternalToolsService } from "../src/modules/internal/internal-tools.service";
import { BadRequestException } from "@nestjs/common";

function createMockServices() {
  const calls: { service: string; method: string; args: any[] }[] = [];

  const journalService = {
    listEntries: async (userId: string, query: any) => {
      calls.push({ service: "journal", method: "listEntries", args: [userId, query] });
      return {
        entries: [{ id: "j1", content: "Went outside", createdAt: new Date() }],
        pagination: { total: 1 },
      };
    },
  } as any;

  const emotionsService = {
    getTrends: async (userId: string, days: number) => {
      calls.push({ service: "emotions", method: "getTrends", args: [userId, days] });
      return { days, dominantEmotion: "calm" };
    },
  } as any;

  const memoryService = {
    search: async (userId: string, query: string, opts: any) => {
      calls.push({ service: "memory", method: "search", args: [userId, query, opts] });
      return [{ id: "m1", content: "Peaceful reflection", similarity: 0.85 }];
    },
  } as any;

  const goalsService = {
    createGoal: async (userId: string, dto: any) => {
      calls.push({ service: "goals", method: "createGoal", args: [userId, dto] });
      return { id: "g1", userId, title: dto.title, status: "ACTIVE" };
    },
  } as any;

  return {
    journalService,
    emotionsService,
    memoryService,
    goalsService,
    calls,
  };
}

test("InternalToolsService: executes get_recent_journal_entries with clamped limit", async () => {
  const mocks = createMockServices();
  const service = new InternalToolsService(
    mocks.journalService,
    mocks.emotionsService,
    mocks.memoryService,
    mocks.goalsService
  );

  const result = await service.executeTool("get_recent_journal_entries", "user-1", { limit: 100 });
  assert.equal(result.success, true);
  assert.equal(mocks.calls.length, 1);
  assert.equal(mocks.calls[0].args[0], "user-1");
  // Limit should be clamped to max 20
  assert.equal(mocks.calls[0].args[1].limit, 20);
});

test("InternalToolsService: executes get_emotion_trends with clamped days", async () => {
  const mocks = createMockServices();
  const service = new InternalToolsService(
    mocks.journalService,
    mocks.emotionsService,
    mocks.memoryService,
    mocks.goalsService
  );

  const result = await service.executeTool("get_emotion_trends", "user-2", { days: 50 });
  assert.equal(result.success, true);
  assert.equal(mocks.calls.length, 1);
  assert.equal(mocks.calls[0].args[0], "user-2");
  // Days should be clamped to max 30
  assert.equal(mocks.calls[0].args[1], 30);
});

test("InternalToolsService: search_memory requires non-empty query", async () => {
  const mocks = createMockServices();
  const service = new InternalToolsService(
    mocks.journalService,
    mocks.emotionsService,
    mocks.memoryService,
    mocks.goalsService
  );

  await assert.rejects(
    () => service.executeTool("search_memory", "user-3", { query: "" }),
    (err: any) => {
      assert.ok(err instanceof BadRequestException);
      assert.ok(err.message.includes("Query string is required"));
      return true;
    }
  );
});

test("InternalToolsService: create_wellness_goal blocks mutation when approved=false", async () => {
  const mocks = createMockServices();
  const service = new InternalToolsService(
    mocks.journalService,
    mocks.emotionsService,
    mocks.memoryService,
    mocks.goalsService
  );

  const result = await service.executeTool("create_wellness_goal", "user-4", {
    title: "Evening Walk",
    approved: false,
  });

  assert.equal(result.success, true);
  assert.equal((result.data as any).status, "PENDING_APPROVAL");
  assert.equal((result.data as any).requiresApproval, true);
  // Crucial: goalsService.createGoal was NEVER called!
  assert.equal(mocks.calls.filter((c) => c.service === "goals").length, 0);
});

test("InternalToolsService: create_wellness_goal executes mutation when approved=true", async () => {
  const mocks = createMockServices();
  const service = new InternalToolsService(
    mocks.journalService,
    mocks.emotionsService,
    mocks.memoryService,
    mocks.goalsService
  );

  const result = await service.executeTool("create_wellness_goal", "user-4", {
    title: "Evening Walk",
    approved: true,
  });

  assert.equal(result.success, true);
  assert.equal((result.data as any).status, "ACTIVE");
  assert.equal(mocks.calls.filter((c) => c.service === "goals").length, 1);
});

test("InternalToolsService: rejects unsupported tool names", async () => {
  const mocks = createMockServices();
  const service = new InternalToolsService(
    mocks.journalService,
    mocks.emotionsService,
    mocks.memoryService,
    mocks.goalsService
  );

  await assert.rejects(
    () => service.executeTool("malicious_unregistered_tool" as any, "user-5", {}),
    (err: any) => {
      assert.ok(err instanceof BadRequestException);
      assert.ok(err.message.includes("Unsupported tool"));
      return true;
    }
  );
});
