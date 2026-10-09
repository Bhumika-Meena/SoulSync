import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  AgentChatRequestSchema,
  AgentApprovalRequestSchema,
  AgentStreamEventTypeSchema,
  InternalToolNameSchema,
  InternalToolExecutionRequestSchema,
  InternalToolExecutionResponseSchema,
  AgentEventPayloadSchema,
  RegisterUserSchema,
  LoginUserSchema,
  CreateJournalEntrySchema,
  CreateWellnessGoalSchema,
  createApiResponseSchema,
  ApiErrorResponseSchema,
} from "../src/index";

describe("Shared Contracts & Schemas Validation Suite", () => {
  describe("Agent DTO Schemas", () => {
    it("should accept valid AgentChatRequest with message and optional threadId", () => {
      const parsed = AgentChatRequestSchema.parse({
        message: "Hello SoulSync, I would like to reflect on my day.",
        threadId: "th_12345",
      });
      assert.equal(parsed.message, "Hello SoulSync, I would like to reflect on my day.");
      assert.equal(parsed.threadId, "th_12345");
    });

    it("should reject empty or whitespace-only messages if min(1)", () => {
      assert.throws(() => {
        AgentChatRequestSchema.parse({ message: "" });
      });
    });

    it("should reject messages exceeding maximum length of 4000 characters", () => {
      const longMessage = "a".repeat(4001);
      assert.throws(() => {
        AgentChatRequestSchema.parse({ message: longMessage });
      });
    });

    it("should validate AgentApprovalRequest with required actionId and approved flag", () => {
      const approved = AgentApprovalRequestSchema.parse({
        actionId: "act_999",
        approved: true,
        threadId: "th_test",
      });
      assert.equal(approved.actionId, "act_999");
      assert.equal(approved.approved, true);

      const rejected = AgentApprovalRequestSchema.parse({
        actionId: "act_999",
        approved: false,
      });
      assert.equal(rejected.approved, false);
      assert.equal(rejected.threadId, undefined);
    });

    it("should reject AgentApprovalRequest missing actionId or approved boolean", () => {
      assert.throws(() => {
        AgentApprovalRequestSchema.parse({ actionId: "act_999" });
      });
      assert.throws(() => {
        AgentApprovalRequestSchema.parse({ approved: true });
      });
    });

    it("should strictly validate AgentStreamEventType enum values", () => {
      const validTypes = [
        "agent.started",
        "tool.started",
        "tool.completed",
        "approval.required",
        "content.delta",
        "agent.completed",
        "agent.error",
      ];
      for (const t of validTypes) {
        assert.equal(AgentStreamEventTypeSchema.parse(t), t);
      }

      assert.throws(() => AgentStreamEventTypeSchema.parse("invalid.type"));
      assert.throws(() => AgentStreamEventTypeSchema.parse("agent.unknown"));
    });

    it("should validate InternalToolNameSchema allowlist", () => {
      const allowed = [
        "get_recent_journal_entries",
        "get_emotion_trends",
        "search_memory",
        "create_wellness_goal",
      ];
      for (const tool of allowed) {
        assert.equal(InternalToolNameSchema.parse(tool), tool);
      }

      assert.throws(() => InternalToolNameSchema.parse("delete_user_account"));
      assert.throws(() => InternalToolNameSchema.parse("execute_raw_sql"));
    });

    it("should validate InternalToolExecutionRequestSchema with default payload", () => {
      const parsed = InternalToolExecutionRequestSchema.parse({
        tool: "get_recent_journal_entries",
        userId: "usr_42",
      });
      assert.equal(parsed.tool, "get_recent_journal_entries");
      assert.equal(parsed.userId, "usr_42");
      assert.deepEqual(parsed.payload, {});
    });

    it("should reject InternalToolExecutionRequest with missing userId", () => {
      assert.throws(() => {
        InternalToolExecutionRequestSchema.parse({
          tool: "search_memory",
          userId: "",
        });
      });
    });

    it("should validate InternalToolExecutionResponseSchema", () => {
      const success = InternalToolExecutionResponseSchema.parse({
        success: true,
        data: { count: 3 },
      });
      assert.equal(success.success, true);

      const failure = InternalToolExecutionResponseSchema.parse({
        success: false,
        error: "Database error",
      });
      assert.equal(failure.success, false);
      assert.equal(failure.error, "Database error");
    });
  });

  describe("Auth DTO Schemas", () => {
    it("should validate RegisterUserSchema with valid email and password", () => {
      const parsed = RegisterUserSchema.parse({
        email: "mindful.user@example.com",
        password: "securePassword123!",
        name: "Soul Seeker",
      });
      assert.equal(parsed.email, "mindful.user@example.com");
      assert.equal(parsed.name, "Soul Seeker");
    });

    it("should reject RegisterUserSchema with invalid email", () => {
      assert.throws(() => {
        RegisterUserSchema.parse({
          email: "not-an-email",
          password: "securePassword123!",
        });
      });
    });

    it("should validate LoginUserSchema", () => {
      const parsed = LoginUserSchema.parse({
        email: "user@soulsync.app",
        password: "secretPassword!",
      });
      assert.equal(parsed.email, "user@soulsync.app");
    });
  });

  describe("Journal and Goals DTO Schemas", () => {
    it("should validate CreateJournalEntrySchema", () => {
      const parsed = CreateJournalEntrySchema.parse({
        content: "I started today with deep breathing and gratitude.",
        htmlContent: "<p>I started today with deep breathing and gratitude.</p>",
      });
      assert.equal(parsed.content, "I started today with deep breathing and gratitude.");
    });

    it("should validate CreateWellnessGoalSchema", () => {
      const parsed = CreateWellnessGoalSchema.parse({
        title: "Daily Evening Walk",
        description: "20 minutes in the park",
      });
      assert.equal(parsed.title, "Daily Evening Walk");
      assert.equal(parsed.status, "PENDING_APPROVAL");
    });

    it("should validate createApiResponseSchema wrapper and ApiErrorResponseSchema", () => {
      const chatResponseSchema = createApiResponseSchema(AgentChatRequestSchema);
      const parsed = chatResponseSchema.parse({
        success: true,
        data: { message: "Hello", threadId: "t1" },
        meta: { timestamp: "2026-10-09T12:00:00Z" },
      });
      assert.equal(parsed.success, true);
      assert.equal(parsed.data.message, "Hello");

      const errorParsed = ApiErrorResponseSchema.parse({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Resource not found",
          statusCode: 404,
          timestamp: new Date().toISOString(),
        },
      });
      assert.equal(errorParsed.success, false);
      assert.equal(errorParsed.error.statusCode, 404);
    });
  });
});
