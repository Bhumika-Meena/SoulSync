import test from "node:test";
import assert from "node:assert/strict";
import { JournalService } from "../src/modules/journal/journal.service";
import { NotFoundException } from "@nestjs/common";

function createMockPrismaService(entriesDatabase: any[] = []) {
  return {
    diaryEntry: {
      findMany: async (args: any) => {
        return entriesDatabase.filter((e) => {
          if (args.where.userId && e.userId !== args.where.userId) return false;
          if (args.where.deletedAt === null && e.deletedAt !== null) return false;
          return true;
        });
      },
      findFirst: async (args: any) => {
        return (
          entriesDatabase.find((e) => {
            if (args.where.id && e.id !== args.where.id) return false;
            if (args.where.userId && e.userId !== args.where.userId) return false;
            if (args.where.deletedAt === null && e.deletedAt !== null) return false;
            return true;
          }) || null
        );
      },
      count: async (args: any) => {
        return entriesDatabase.filter((e) => {
          if (args.where.userId && e.userId !== args.where.userId) return false;
          if (args.where.deletedAt === null && e.deletedAt !== null) return false;
          return true;
        }).length;
      },
      create: async (args: any) => {
        const newEntry = {
          id: `entry-${Date.now()}`,
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          emotionAnalyses: [],
        };
        entriesDatabase.push(newEntry);
        return newEntry;
      },
      update: async (args: any) => {
        const existing = entriesDatabase.find((e) => e.id === args.where.id);
        if (!existing) throw new Error("Record not found");
        Object.assign(existing, args.data);
        return existing;
      },
    },
  } as any;
}

function createMockMemoryService() {
  const stored: any[] = [];
  const deleted: any[] = [];
  return {
    store: async (userId: string, data: any) => {
      stored.push({ userId, ...data });
      return { id: "mem-1" };
    },
    deleteBySource: async (userId: string, sourceId: string) => {
      deleted.push({ userId, sourceId });
      return { count: 1 };
    },
    getStored: () => stored,
    getDeleted: () => deleted,
  } as any;
}

test("JournalService: lists paginated entries scoped strictly to authenticated user", async () => {
  const mockDb = [
    { id: "e1", userId: "user-alice", content: "Alice reflection 1", deletedAt: null },
    { id: "e2", userId: "user-bob", content: "Bob reflection 1", deletedAt: null },
    { id: "e3", userId: "user-alice", content: "Alice reflection 2", deletedAt: null },
  ];
  const prisma = createMockPrismaService(mockDb);
  const memory = createMockMemoryService();
  const service = new JournalService(prisma, memory);

  const result = await service.listEntries("user-alice");
  assert.equal(result.entries.length, 2);
  assert.equal(result.pagination.total, 2);
  assert.ok(result.entries.every((e: any) => e.userId === "user-alice"));
});

test("JournalService: getEntryById retrieves user owned entry", async () => {
  const mockDb = [
    { id: "entry-10", userId: "user-alice", content: "Alice peaceful day", deletedAt: null },
  ];
  const prisma = createMockPrismaService(mockDb);
  const memory = createMockMemoryService();
  const service = new JournalService(prisma, memory);

  const entry = await service.getEntryById("user-alice", "entry-10");
  assert.equal(entry.id, "entry-10");
  assert.equal(entry.content, "Alice peaceful day");
});

test("JournalService: getEntryById denies access to another user's entry (cross-tenant isolation)", async () => {
  const mockDb = [
    { id: "entry-99", userId: "user-bob", content: "Bob secret entry", deletedAt: null },
  ];
  const prisma = createMockPrismaService(mockDb);
  const memory = createMockMemoryService();
  const service = new JournalService(prisma, memory);

  await assert.rejects(
    () => service.getEntryById("user-alice", "entry-99"),
    (err: any) => {
      assert.ok(err instanceof NotFoundException);
      assert.equal(err.getResponse().code, "ENTRY_NOT_FOUND");
      return true;
    }
  );
});

test("JournalService: createEntry creates journal and triggers memory ingestion", async () => {
  const mockDb: any[] = [];
  const prisma = createMockPrismaService(mockDb);
  const memory = createMockMemoryService();
  const service = new JournalService(prisma, memory);

  const created = await service.createEntry("user-alice", {
    content: "Today I walked in the garden and felt peaceful.",
  });

  assert.ok(created.id);
  assert.equal(created.userId, "user-alice");
  assert.equal(mockDb.length, 1);

  // Check automated memory ingestion
  const storedMemories = memory.getStored();
  assert.equal(storedMemories.length, 1);
  assert.equal(storedMemories[0].userId, "user-alice");
  assert.equal(storedMemories[0].sourceType, "JOURNAL_ENTRY");
  assert.equal(storedMemories[0].content, "Today I walked in the garden and felt peaceful.");
});

test("JournalService: deleteEntry soft deletes entry and purges associated memory embedding", async () => {
  const mockDb = [
    { id: "entry-to-delete", userId: "user-alice", content: "Temporary entry", deletedAt: null },
  ];
  const prisma = createMockPrismaService(mockDb);
  const memory = createMockMemoryService();
  const service = new JournalService(prisma, memory);

  await service.deleteEntry("user-alice", "entry-to-delete");

  assert.ok(mockDb[0].deletedAt instanceof Date);
  const deletedMemories = memory.getDeleted();
  assert.equal(deletedMemories.length, 1);
  assert.equal(deletedMemories[0].sourceId, "entry-to-delete");
});

test("JournalService: deleteEntry rejects deletion attempt on another user's entry", async () => {
  const mockDb = [
    { id: "entry-bob", userId: "user-bob", content: "Bob private entry", deletedAt: null },
  ];
  const prisma = createMockPrismaService(mockDb);
  const memory = createMockMemoryService();
  const service = new JournalService(prisma, memory);

  await assert.rejects(
    () => service.deleteEntry("user-alice", "entry-bob"),
    (err: any) => {
      assert.ok(err instanceof NotFoundException);
      assert.equal(err.getResponse().code, "ENTRY_NOT_FOUND");
      return true;
    }
  );
  assert.equal(mockDb[0].deletedAt, null);
});
