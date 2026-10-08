import { ApiClientError } from "./errors";

export type AgentStreamEvent =
  | { type: "agent.started"; data: { threadId: string; [key: string]: unknown } }
  | { type: "tool.started"; data: { tool: string; message: string; [key: string]: unknown } }
  | { type: "tool.completed"; data: { tool: string; [key: string]: unknown } }
  | {
      type: "approval.required";
      data: {
        actionId: string;
        tool: string;
        proposedAction: {
          actionId?: string;
          tool?: string;
          title: string;
          description?: string;
          [key: string]: unknown;
        };
        message: string;
        [key: string]: unknown;
      };
    }
  | { type: "content.delta"; data: { text: string } }
  | { type: "agent.completed"; data: { response: string; [key: string]: unknown } }
  | { type: "agent.error"; data: { message: string; [key: string]: unknown } };

export interface AgentStreamCallbacks {
  onEvent?: (event: AgentStreamEvent) => void;
  onDelta?: (text: string) => void;
  onToolStarted?: (tool: string, message: string) => void;
  onToolCompleted?: (tool: string, data: Record<string, unknown>) => void;
  onApprovalRequired?: (data: {
    actionId: string;
    tool: string;
    proposedAction: {
      actionId?: string;
      tool?: string;
      title: string;
      description?: string;
      [key: string]: unknown;
    };
    message: string;
  }) => void;
  onCompleted?: (response: string) => void;
  onError?: (error: Error | string) => void;
}

/**
 * Incremental parser for Server-Sent Events (SSE) data streams.
 * Correctly buffers partial lines, handles split chunks, and dispatches complete events.
 */
export class SseChunkParser {
  private buffer = "";

  /**
   * Feed a raw text chunk to the parser and return all fully formed parsed events.
   */
  feed(chunk: string): AgentStreamEvent[] {
    // Normalize CRLF to LF
    this.buffer += chunk.replace(/\r\n/g, "\n");
    const events: AgentStreamEvent[] = [];

    let boundaryIndex: number;
    // An SSE message is delimited by double newlines (\n\n)
    while ((boundaryIndex = this.buffer.indexOf("\n\n")) !== -1) {
      const messageBlock = this.buffer.slice(0, boundaryIndex).trim();
      this.buffer = this.buffer.slice(boundaryIndex + 2);

      if (!messageBlock) continue;

      const parsedEvent = this.parseBlock(messageBlock);
      if (parsedEvent) {
        events.push(parsedEvent);
      }
    }

    return events;
  }

  /**
   * Parse an individual SSE message block.
   */
  private parseBlock(block: string): AgentStreamEvent | null {
    const lines = block.split("\n");
    let eventType = "message";
    const dataLines: string[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      if (line.startsWith("event:")) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      }
    }

    if (dataLines.length === 0) {
      return null;
    }

    const rawData = dataLines.join("\n");
    let parsedData: any = rawData;
    try {
      parsedData = JSON.parse(rawData);
    } catch {
      // Fallback for non-JSON strings
      parsedData = { text: rawData };
    }

    return {
      type: eventType as any,
      data: parsedData,
    };
  }

  /**
   * Flush any remaining buffered message upon stream end.
   */
  flush(): AgentStreamEvent[] {
    const remaining = this.buffer.trim();
    this.buffer = "";
    if (!remaining) return [];
    const event = this.parseBlock(remaining);
    return event ? [event] : [];
  }
}

/**
 * Dispatch an individual SSE event to the corresponding user callbacks.
 */
export function dispatchStreamEvent(event: AgentStreamEvent, callbacks: AgentStreamCallbacks): void {
  callbacks.onEvent?.(event);

  switch (event.type) {
    case "content.delta":
      callbacks.onDelta?.(event.data.text);
      break;
    case "tool.started":
      callbacks.onToolStarted?.(event.data.tool, event.data.message);
      break;
    case "tool.completed":
      callbacks.onToolCompleted?.(event.data.tool, event.data as Record<string, unknown>);
      break;
    case "approval.required":
      callbacks.onApprovalRequired?.(event.data);
      break;
    case "agent.completed":
      callbacks.onCompleted?.(event.data.response);
      break;
    case "agent.error":
      callbacks.onError?.(event.data.message);
      break;
  }
}

/**
 * Consumes a ReadableStream<Uint8Array>, decoding and parsing incremental SSE chunks.
 */
export async function processReadableStream(
  body: ReadableStream<Uint8Array>,
  callbacks: AgentStreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const parser = new SseChunkParser();

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        break;
      }

      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const events = parser.feed(chunk);
      for (const ev of events) {
        dispatchStreamEvent(ev, callbacks);
      }
    }

    const trailingEvents = parser.flush();
    for (const ev of trailingEvents) {
      dispatchStreamEvent(ev, callbacks);
    }
  } catch (err: any) {
    if (signal?.aborted || err.name === "AbortError") {
      return;
    }
    const errorObj = err instanceof Error ? err : new ApiClientError(0, String(err), "STREAM_ERROR");
    callbacks.onError?.(errorObj);
    throw errorObj;
  } finally {
    reader.releaseLock();
  }
}
