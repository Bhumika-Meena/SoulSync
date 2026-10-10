# SoulSync 2.0 — Agent Boundary & Execution Protocol

## Communication Protocol
* NestJS forwards client prompts to `services/agent` via `POST /internal/v1/agent/run` and `POST /internal/v1/agent/approve`.
* Protected by HMAC authentication:
  * `X-Internal-Signature: HMAC-SHA256(timestamp + body, INTERNAL_AGENT_SECRET)`
  * `X-Internal-Timestamp: <unix_epoch_seconds>`
* Bounded to a 300-second timestamp drift window with in-memory replay attack prevention.

## Distributed Correlation & Request Lifecycle
Every interaction is tagged with a consistent correlation identifier across all boundaries:
`Web (apps/web) → NestJS API (apps/api) → FastAPI Agent (services/agent) → NestJS Tool Gateway (apps/api)`

### Correlation Headers
* `x-correlation-id`: Canonical distributed correlation identifier. Validated as an alphanumeric/hyphen string (up to 64 chars); sanitized or regenerated server-side if missing or invalid.
* `x-request-id`: Paired client request identifier for tracing individual HTTP hops.

Both headers are propagated across internal service calls:
1. Web client generates or attaches headers in `apps/web/lib/api/client.ts`.
2. NestJS `CorrelationMiddleware` validates or generates `correlationId`, sets response headers, and binds it to the request context.
3. NestJS `AgentService` forwards `x-correlation-id` and `x-request-id` to the Python agent inside internal requests.
4. FastAPI `CorrelationIdMiddleware` extracts the header and stores it in request-scoped `contextvars.ContextVar` (`correlation_id_ctx`), guaranteeing cross-request isolation under concurrency.
5. Python `ApiClient` forwards `x-correlation-id` when invoking the NestJS Tool Gateway (`/internal/v1/tools/execute`).
6. NestJS Tool Gateway executes the tool and logs operation outcomes under the same `correlationId`.

## Streaming Lifecycle & Event Contracts
The browser receives safe execution tokens via Server-Sent Events (SSE). Internal chain-of-thought, system prompts, and tool implementation details are never exposed to clients:

* `agent.started` — Signals beginning of execution turn.
* `tool.started` — Friendly public status (e.g., "Inspecting recent journal entries...").
* `tool.completed` — Summarizes tool execution result.
* `approval.required` — Interruption event prompting client for interactive approval (HITL).
* `content.delta` — Token text chunks streaming incrementally into companion chat.
* `agent.completed` — Terminal event signaling successful completion of response turn.
* `agent.error` — Terminal event with a safe, user-friendly error message if upstream models or services fail.

### Streaming Reliability Invariants
1. **Connection Timeout vs. Stream Lifetime**:
   * Upstream connection establishment has a bounded 15-second setup timeout via `AbortController`.
   * Once SSE headers are received and streaming begins, the stream can run for normal conversational generation without being prematurely terminated by a short request timeout.
2. **Client Disconnect Cancellation**:
   * Downstream client disconnects are captured via `res.on("close")`.
   * When the downstream client drops, the upstream fetch controller is immediately aborted, terminating upstream agent generation and freeing resources.
3. **Exactly-Once Terminal Event**:
   * Streams strictly guarantee emitting at most one terminal event (`agent.completed` or `agent.error`).
   * The Python agent tracks `terminal_emitted = True` across normal completion, model exceptions, and cancellation.
   * NestJS guards all writes with `!res.writableEnded` to prevent writes after client connection termination.

## Initial Toolset
1. `get_recent_journal_entries` (Read)
2. `get_emotion_trends` (Read)
3. `search_memory` (Read - pgvector cosine similarity)
4. `create_wellness_goal` (Write - Requires Human-in-the-Loop Approval)

## Known Process-Local Limitations
* **LangGraph `MemorySaver`**: Conversation state and HITL checkpointer use LangGraph's in-memory `MemorySaver` within the Python agent process. Thread checkpoints are local to the running container. In multi-instance or auto-scaling deployments without sticky routing, thread state is isolated per process.
* **HMAC Replay Cache**: Replay attack protection in `InternalHmacGuard` maintains an in-memory nonce set bounded to the 300-second timestamp window. This protects against immediate replay attacks within a single instance. In horizontally-scaled multi-instance clusters, cluster-wide replay prevention would require an external shared cache (e.g. Redis), which is intentionally excluded from the current single-instance Render topology.
