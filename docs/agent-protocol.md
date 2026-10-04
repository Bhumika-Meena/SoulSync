# SoulSync 2.0 — Agent Boundary & Execution Protocol

## Communication Protocol
* NestJS forwards client prompts to `services/agent` via `POST /internal/v1/agent/run`.
* Protected by `X-Internal-Signature: HMAC-SHA256(timestamp + body, INTERNAL_AGENT_SECRET)`.

## Safe Streaming Events
The browser receives safe execution tokens via Server-Sent Events (SSE). Internal chain-of-thought is never exposed:

* `agent.started` — Signals beginning of execution turn.
* `tool.started` — Displays friendly status (e.g., "Inspecting recent journal entries...").
* `tool.completed` — Summarizes tool execution result.
* `approval.required` — Interruption event prompting client for interactive approval.
* `content.delta` — Token text chunks streaming into companion chat bubble.
* `agent.completed` — Signals end of response turn.
* `agent.error` — User-friendly error message if a model or connection fails.

## Initial Toolset
1. `get_recent_journal_entries` (Read)
2. `get_emotion_trends` (Read)
3. `search_memory` (Read - pgvector cosine similarity)
4. `create_wellness_goal` (Write - Requires Human-in-the-Loop Approval)
