import test from "node:test";
import assert from "node:assert/strict";
import { api } from "../lib/api/client";
import { ApiClientError } from "../lib/api/errors";

function mockFetchResponses(responses: { status: number; body: any; headers?: Record<string, string> }[]) {
  let callIndex = 0;
  const recordedCalls: { url: string; options: RequestInit }[] = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = input.toString();
    recordedCalls.push({ url, options: init || {} });

    const currentResponse = responses[callIndex++] || { status: 200, body: { success: true } };
    const bodyText =
      typeof currentResponse.body === "string"
        ? currentResponse.body
        : JSON.stringify(currentResponse.body);

    return new Response(bodyText, {
      status: currentResponse.status,
      headers: {
        "Content-Type": "application/json",
        ...(currentResponse.headers || {}),
      },
    });
  }) as any;

  const restore = () => {
    globalThis.fetch = originalFetch;
  };

  return { recordedCalls, restore };
}

test("api.agent: injects Authorization Bearer header when token provided in context", async () => {
  const { recordedCalls, restore } = mockFetchResponses([{ status: 200, body: [] }]);
  try {
    await api.agent.listThreads({ token: "test-jwt-token-xyz" });

    assert.equal(recordedCalls.length, 1);
    const headers = recordedCalls[0].options.headers as Record<string, string>;
    assert.equal(headers["Authorization"], "Bearer test-jwt-token-xyz");
  } finally {
    restore();
  }
});

test("api.agent: listThreads calls correct GET endpoint", async () => {
  const { recordedCalls, restore } = mockFetchResponses([
    { status: 200, body: [{ id: "t1", title: "Reflection" }] },
  ]);
  try {
    const threads = await api.agent.listThreads();
    assert.equal(threads.length, 1);
    assert.equal(threads[0].id, "t1");
    assert.ok(recordedCalls[0].url.includes("/api/v1/agent/threads"));
    assert.equal(recordedCalls[0].options.method, "GET");
  } finally {
    restore();
  }
});

test("api.agent: listMessages calls correct GET endpoint with threadId", async () => {
  const { recordedCalls, restore } = mockFetchResponses([
    { status: 200, body: [{ id: "m1", content: "Hello" }] },
  ]);
  try {
    const messages = await api.agent.listMessages("thread-42");
    assert.equal(messages.length, 1);
    assert.ok(recordedCalls[0].url.includes("/api/v1/agent/threads/thread-42/messages"));
    assert.equal(recordedCalls[0].options.method, "GET");
  } finally {
    restore();
  }
});

test("api.agent: chatStream calls POST endpoint with serialized body", async () => {
  const sseBody = 'event: agent.completed\ndata: {"response":"Finished"}\n\n';
  const { recordedCalls, restore } = mockFetchResponses([
    { status: 200, body: sseBody, headers: { "Content-Type": "text/event-stream" } },
  ]);
  try {
    let completedText = "";
    await api.agent.chatStream(
      { message: "Mindful prompt", threadId: "t-1" },
      { onCompleted: (res) => { completedText = res; } }
    );

    assert.ok(recordedCalls[0].url.includes("/agent/chat"));
    assert.equal(recordedCalls[0].options.method, "POST");
    const sentBody = JSON.parse(recordedCalls[0].options.body as string);
    assert.equal(sentBody.message, "Mindful prompt");
    assert.equal(sentBody.threadId, "t-1");
    assert.equal(completedText, "Finished");
  } finally {
    restore();
  }
});

test("api.agent: approveStream calls POST endpoint with approval decision", async () => {
  const sseBody = 'event: agent.completed\ndata: {"response":"Action processed."}\n\n';
  const { recordedCalls, restore } = mockFetchResponses([
    { status: 200, body: sseBody, headers: { "Content-Type": "text/event-stream" } },
  ]);
  try {
    let completedText = "";
    await api.agent.approveStream(
      { actionId: "act_42", approved: false, threadId: "t-2" },
      { onCompleted: (res) => { completedText = res; } }
    );

    assert.ok(recordedCalls[0].url.includes("/agent/approve"));
    assert.equal(recordedCalls[0].options.method, "POST");
    const sentBody = JSON.parse(recordedCalls[0].options.body as string);
    assert.equal(sentBody.actionId, "act_42");
    assert.equal(sentBody.approved, false);
    assert.equal(sentBody.threadId, "t-2");
    assert.equal(completedText, "Action processed.");
  } finally {
    restore();
  }
});

test("api: transforms HTTP 401 response into ApiClientError UNAUTHORIZED", async () => {
  const { restore } = mockFetchResponses([
    { status: 401, body: { code: "UNAUTHORIZED", message: "Token expired" } },
  ]);
  try {
    await assert.rejects(
      () => api.agent.listThreads(),
      (err: any) => {
        assert.ok(err instanceof ApiClientError);
        assert.equal(err.statusCode, 401);
        assert.equal(err.code, "UNAUTHORIZED");
        assert.ok(err.message.includes("Token expired"));
        return true;
      }
    );
  } finally {
    restore();
  }
});
