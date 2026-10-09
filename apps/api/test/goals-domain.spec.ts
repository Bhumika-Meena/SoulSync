import test from "node:test";
import assert from "node:assert/strict";
import { GoalsService } from "../src/modules/goals/goals.service";
import { NotFoundException } from "@nestjs/common";

function createMockPrismaService(goalsDatabase: any[] = []) {
  return {
    wellnessGoal: {
      findMany: async (args: any) => {
        return goalsDatabase.filter((g) => {
          if (args.where.userId && g.userId !== args.where.userId) return false;
          if (args.where.status && g.status !== args.where.status) return false;
          return true;
        });
      },
      findFirst: async (args: any) => {
        return (
          goalsDatabase.find((g) => {
            if (args.where.id && g.id !== args.where.id) return false;
            if (args.where.userId && g.userId !== args.where.userId) return false;
            return true;
          }) || null
        );
      },
      create: async (args: any) => {
        const goal = {
          id: `goal-${Date.now()}`,
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        goalsDatabase.push(goal);
        return goal;
      },
      update: async (args: any) => {
        const existing = goalsDatabase.find((g) => g.id === args.where.id);
        if (!existing) throw new Error("Goal not found");
        Object.assign(existing, args.data);
        return existing;
      },
    },
  } as any;
}

function createMockMemoryService() {
  const stored: any[] = [];
  return {
    store: async (userId: string, data: any) => {
      stored.push({ userId, ...data });
      return { id: "mem-goal-1" };
    },
    getStored: () => stored,
  } as any;
}

test("GoalsService: creates a wellness goal with automatic memory embedding ingestion", async () => {
  const mockDb: any[] = [];
  const prisma = createMockPrismaService(mockDb);
  const memory = createMockMemoryService();
  const service = new GoalsService(prisma, memory);

  const goal = await service.createGoal("user-alice", {
    title: "Morning Box Breathing",
    description: "5 minutes box breathing after waking up",
  });

  assert.equal(goal.userId, "user-alice");
  assert.equal(goal.title, "Morning Box Breathing");
  assert.equal(goal.status, "PENDING_APPROVAL");

  const storedMemories = memory.getStored();
  assert.equal(storedMemories.length, 1);
  assert.equal(storedMemories[0].sourceType, "GOAL");
  assert.ok(storedMemories[0].content.includes("Morning Box Breathing"));
});

test("GoalsService: listGoals scopes goals strictly to authenticated user", async () => {
  const mockDb = [
    { id: "g1", userId: "user-alice", title: "Alice Goal 1", status: "ACTIVE" },
    { id: "g2", userId: "user-bob", title: "Bob Goal 1", status: "ACTIVE" },
  ];
  const prisma = createMockPrismaService(mockDb);
  const memory = createMockMemoryService();
  const service = new GoalsService(prisma, memory);

  const aliceGoals = await service.listGoals("user-alice");
  assert.equal(aliceGoals.length, 1);
  assert.equal(aliceGoals[0].id, "g1");
});

test("GoalsService: getGoalById denies access to goals owned by another user", async () => {
  const mockDb = [
    { id: "g-bob", userId: "user-bob", title: "Bob Private Goal", status: "ACTIVE" },
  ];
  const prisma = createMockPrismaService(mockDb);
  const memory = createMockMemoryService();
  const service = new GoalsService(prisma, memory);

  await assert.rejects(
    () => service.getGoalById("user-alice", "g-bob"),
    (err: any) => {
      assert.ok(err instanceof NotFoundException);
      assert.equal(err.getResponse().code, "GOAL_NOT_FOUND");
      return true;
    }
  );
});

test("GoalsService: updateGoal updates status and refreshes memory embedding", async () => {
  const mockDb = [
    { id: "g-update", userId: "user-alice", title: "Original Goal", status: "PENDING_APPROVAL" },
  ];
  const prisma = createMockPrismaService(mockDb);
  const memory = createMockMemoryService();
  const service = new GoalsService(prisma, memory);

  const updated = await service.updateGoal("user-alice", "g-update", {
    status: "ACTIVE",
    title: "Updated Mindful Habit",
  });

  assert.equal(updated.status, "ACTIVE");
  assert.equal(updated.title, "Updated Mindful Habit");

  const stored = memory.getStored();
  assert.ok(stored.some((m) => m.content.includes("Updated Mindful Habit")));
});
