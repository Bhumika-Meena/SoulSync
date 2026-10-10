import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { api } from "../lib/api/client";
import { ApiClientError } from "../lib/api/errors";

describe("Phase 10 Web Observability & Correlation Suite", () => {
  it("api.agent.chatStream attaches x-correlation-id and x-request-id headers", async () => {
    let capturedHeaders: Record<string, string> = {};
    const originalFetch = global.fetch;

    global.fetch = async (url: any, init: any) => {
      capturedHeaders = init?.headers || {};
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode("event: agent.completed\ndata: {\"response\": \"Done\"}\n\n")
            );
            controller.close();
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "x-correlation-id": capturedHeaders["x-correlation-id"] || "corr_fallback",
          },
        }
      );
    };

    try {
      await api.agent.chatStream(
        { message: "Mindful prompt" },
        {},
        { headers: { "x-correlation-id": "client_corr_12345" } }
      );

      assert.equal(capturedHeaders["x-correlation-id"], "client_corr_12345");
      assert.equal(capturedHeaders["x-request-id"], "client_corr_12345");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("api.agent.approveStream generates a correlation ID when none is provided", async () => {
    let capturedHeaders: Record<string, string> = {};
    const originalFetch = global.fetch;

    global.fetch = async (url: any, init: any) => {
      capturedHeaders = init?.headers || {};
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode("event: agent.completed\ndata: {\"response\": \"Approved\"}\n\n")
            );
            controller.close();
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }
      );
    };

    try {
      await api.agent.approveStream(
        { actionId: "act_123", approved: true },
        {}
      );

      assert.ok(capturedHeaders["x-correlation-id"]);
      assert.ok(capturedHeaders["x-request-id"]);
      assert.equal(capturedHeaders["x-correlation-id"], capturedHeaders["x-request-id"]);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("ApiClientError preserves requestId from server error envelope", () => {
    const error = new ApiClientError(
      500,
      "Internal server error",
      "INTERNAL_SERVER_ERROR",
      undefined,
      "/api/v1/agent/chat",
      "2026-10-10T00:00:00Z",
      "req_corr_abc_999"
    );

    assert.equal(error.statusCode, 500);
    assert.equal(error.requestId, "req_corr_abc_999");
    assert.equal(error.code, "INTERNAL_SERVER_ERROR");
  });
});
