import test from "node:test";
import assert from "node:assert/strict";
import { SseChunkParser, processReadableStream, type AgentStreamEvent } from "../lib/api/sse";

test("SseChunkParser: parses single complete SSE frame", () => {
  const parser = new SseChunkParser();
  const chunk = 'event: agent.started\ndata: {"threadId":"t-100"}\n\n';

  const events = parser.feed(chunk);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "agent.started");
  assert.equal((events[0].data as any).threadId, "t-100");
});

test("SseChunkParser: buffers and reconstructs events split across network chunks", () => {
  const parser = new SseChunkParser();

  // Packet 1: partial event type
  const evs1 = parser.feed("event: content");
  assert.equal(evs1.length, 0);

  // Packet 2: rest of type and start of data
  const evs2 = parser.feed('.delta\ndata: {"text":"Mind');
  assert.equal(evs2.length, 0);

  // Packet 3: end of data and frame boundary
  const evs3 = parser.feed('fulness"}\n\n');
  assert.equal(evs3.length, 1);
  assert.equal(evs3[0].type, "content.delta");
  assert.equal((evs3[0].data as any).text, "Mindfulness");
});

test("SseChunkParser: parses multiple frames delivered in a single chunk", () => {
  const parser = new SseChunkParser();
  const chunk =
    'event: tool.started\ndata: {"tool":"search_memory","message":"Searching..."}\n\n' +
    'event: tool.completed\ndata: {"tool":"search_memory","itemsFound":2}\n\n' +
    'event: content.delta\ndata: {"text":"I remember"}\n\n';

  const events = parser.feed(chunk);
  assert.equal(events.length, 3);
  assert.equal(events[0].type, "tool.started");
  assert.equal(events[1].type, "tool.completed");
  assert.equal(events[2].type, "content.delta");
});

test("SseChunkParser: handles Windows CRLF line endings", () => {
  const parser = new SseChunkParser();
  const chunk = 'event: content.delta\r\ndata: {"text":"CRLF test"}\r\n\r\n';

  const events = parser.feed(chunk);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "content.delta");
  assert.equal((events[0].data as any).text, "CRLF test");
});

test("SseChunkParser: ignores comment lines and malformed frames without throwing", () => {
  const parser = new SseChunkParser();
  const chunk =
    ": keepalive ping\n" +
    "invalid line without colon\n\n" +
    'event: agent.completed\ndata: {"response":"All set."}\n\n';

  const events = parser.feed(chunk);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "agent.completed");
  assert.equal((events[0].data as any).response, "All set.");
});

test("SseChunkParser: parses approval.required event with proposed action details", () => {
  const parser = new SseChunkParser();
  const chunk =
    "event: approval.required\n" +
    'data: {"actionId":"act_123","tool":"create_wellness_goal","proposedAction":{"title":"Morning Walk"},"message":"Would you like me to set this goal?"}\n\n';

  const events = parser.feed(chunk);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "approval.required");
  const data = events[0].data as any;
  assert.equal(data.actionId, "act_123");
  assert.equal(data.tool, "create_wellness_goal");
  assert.equal(data.proposedAction.title, "Morning Walk");
});

test("consumeAgentEventStream: dispatches lifecycle callbacks appropriately", async () => {
  const streamText =
    'event: agent.started\ndata: {"threadId":"t-test"}\n\n' +
    'event: tool.started\ndata: {"tool":"search_memory","message":"Thinking"}\n\n' +
    'event: tool.completed\ndata: {"tool":"search_memory","itemsFound":1}\n\n' +
    'event: content.delta\ndata: {"text":"Peace "}\n\n' +
    'event: content.delta\ndata: {"text":"and joy."}\n\n' +
    'event: agent.completed\ndata: {"response":"Peace and joy."}\n\n';

  const encoder = new TextEncoder();
  const uint8 = encoder.encode(streamText);

  // Mock ReadableStream
  let readCount = 0;
  const mockReader = {
    read: async () => {
      if (readCount === 0) {
        readCount++;
        return { done: false, value: uint8 };
      }
      return { done: true, value: undefined };
    },
    releaseLock: () => {},
  };
  const mockStream = {
    getReader: () => mockReader,
  } as unknown as ReadableStream<Uint8Array>;

  const deltas: string[] = [];
  let completedResponse = "";
  let toolStartedName = "";
  let toolCompletedName = "";

  await processReadableStream(mockStream, {
    onDelta: (text) => deltas.push(text),
    onToolStarted: (tool) => { toolStartedName = tool; },
    onToolCompleted: (tool) => { toolCompletedName = tool; },
    onCompleted: (res) => { completedResponse = res; },
  });

  assert.equal(deltas.join(""), "Peace and joy.");
  assert.equal(completedResponse, "Peace and joy.");
  assert.equal(toolStartedName, "search_memory");
  assert.equal(toolCompletedName, "search_memory");
});

test("consumeAgentEventStream: abort controller stops stream consumption", async () => {
  const encoder = new TextEncoder();
  const chunk1 = encoder.encode('event: content.delta\ndata: {"text":"First "}\n\n');
  const chunk2 = encoder.encode('event: content.delta\ndata: {"text":"Second "}\n\n');

  const controller = new AbortController();
  let calls = 0;

  const mockReader = {
    read: async () => {
      calls++;
      if (calls === 1) {
        // Abort right after first read
        controller.abort();
        return { done: false, value: chunk1 };
      }
      return { done: false, value: chunk2 };
    },
    releaseLock: () => {},
  };

  const mockStream = {
    getReader: () => mockReader,
  } as unknown as ReadableStream<Uint8Array>;

  const deltas: string[] = [];

  await processReadableStream(
    mockStream,
    { onDelta: (text) => deltas.push(text) },
    controller.signal
  );

  // Second chunk should not have been processed because of abort
  assert.equal(deltas.length, 1);
  assert.equal(deltas[0], "First ");
});
