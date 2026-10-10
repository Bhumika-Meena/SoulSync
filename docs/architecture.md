# SoulSync 2.0 — Architecture Overview

SoulSync 2.0 is a decoupled, portfolio-grade AI Agent application designed for emotional journaling and reflective companion workflows.

## System Topology

```
Next.js 15 (React 19) → Vercel
      ↓ (REST / SSE with x-correlation-id)
NestJS 11 Gateway      → Render (Node Web Service)
      ↓ (Internal HMAC + x-correlation-id)
FastAPI + LangGraph    → Render (Docker Web Service)
      ↓ (Internal Tool Gateway HMAC + x-correlation-id)
NestJS Tool Gateway    → apps/api
      ↓ (Prisma / pgvector)
PostgreSQL 16 + pgvector → Render Managed DB
```

## Core Principles
1. **API Owns Business Access:** The NestJS API is the sole gatekeeper of user data and database transactions.
2. **Zero-Trust Tool Sandbox:** The Python Agent interacts with user data only through scoped tool endpoints enforcing `userId`.
3. **Structured TipTap AST:** Journal content is stored as ProseMirror JSON trees, completely preventing Stored XSS.
4. **Human-in-the-Loop Write Actions:** Mutating operations (e.g. creating wellness goals) pause execution and require explicit user approval.
5. **No AWS Lock-In:** All services run in standard containers on Vercel and Render within a realistic ~$30/mo budget, fully portable to AWS later.

---

## Observability & Structured Logging

### Correlation Propagation
Every HTTP request across the system carries a unified correlation identifier:
* Client $\rightarrow$ API: `x-correlation-id` and `x-request-id` headers.
* API $\rightarrow$ Agent: Forwarded via signed internal POST requests.
* Agent $\rightarrow$ Tool Gateway: Forwarded via signed internal tool invocation requests.

### Structured JSON Logging Standard
Both `apps/api` and `services/agent` emit single-line structured JSON logs with an allowlist of fields:
* **API Fields**: `timestamp`, `service` (`soulsync-api`), `correlationId`, `method`, `route` (parameter-sanitized, query strings stripped), `statusCode`, `durationMs`, and client IP.
* **Agent Fields**: `timestamp`, `service` (`soulsync-agent`), `correlation_id`, `logger`, `level`, `message`, `operation`, `duration_ms`, `outcome`, `error_category`.
* **Tool Gateway Fields**: `timestamp`, `service` (`soulsync-api`), `operation` (`internal_tool.execute`), `tool`, `userId`, `correlationId`, `outcome`.

### Privacy Invariants (Strict Zero-Leakage Policy)
* **No Authentication Secrets**: Passwords, JWT secrets, refresh tokens, and internal HMAC secrets are strictly forbidden from log output.
* **No User Private Journal Content**: Neither user reflection text, journal body ASTs, nor vector embeddings are logged.
* **No Raw Prompt or Reasoning Leaks**: Full system prompts, chain-of-thought tokens, and raw model parameter dictionaries are excluded from application logs.
* **No Infrastructure Secrets**: Database connection strings, credentials, and raw database driver stack traces are never printed in log outputs or returned in error payloads.

---

## Service Probes: Liveness vs. Readiness

### NestJS API (`apps/api`)
* **Liveness Probe**: `GET /health` or `GET /healthz`
  * Returns: `{"status":"ok","timestamp":"...","uptime":...}`
  * Purpose: Lightweight check verifying process event-loop responsiveness. Does **not** query PostgreSQL, preventing cascading container restarts during database transient spikes.
* **Readiness Probe**: `GET /health/ready` or `GET /healthz/ready`
  * Returns: `200 {"status":"ready","database":"connected",...}` or `503 {"status":"unavailable","database":"disconnected"}`
  * Purpose: Executes a bounded `SELECT 1` query with a 3-second timeout to confirm database connectivity before accepting user traffic. Returns sanitized status without leaking connection strings or SQL exceptions.

### FastAPI Agent (`services/agent`)
* **Liveness Probe**: `GET /healthz`
  * Returns: `{"status":"ok","service":"soulsync-agent"}`
  * Purpose: Confirms Python process is responsive.
* **Readiness Probe**: `GET /health/ready` or `GET /readyz`
  * Returns: `200 {"status":"ready","service":"soulsync-agent"}` or `503 {"status":"not_ready","reason":"..."}`
  * Purpose: Validates that critical configuration secrets (`INTERNAL_AGENT_SECRET`, `API_INTERNAL_URL`) are present and valid without making expensive or unbounded external model API calls.

---

## Operational Runbooks & Troubleshooting

### 1. Database Connection Failures
* **Symptom**: `GET /health/ready` returns HTTP 503; API logs show `Database check failed`.
* **Diagnosis**: Check Render Managed DB connectivity, `DATABASE_URL` credentials, and connection pool saturation.
* **Mitigation**: Verify network access, restart database instance if frozen, or adjust connection pool limits in Prisma.

### 2. Model Provider & Streaming Failures
* **Symptom**: Client receives `agent.error` SSE event with `"Our companion service is currently unavailable"`.
* **Diagnosis**: Search agent logs for `error_category="upstream_provider_failure"` matching the request's `correlation_id`.
* **Mitigation**: Inspect model API quota, provider rate limits, or network egress from the agent container.

### 3. Tool Gateway & HMAC Rejections
* **Symptom**: Agent logs report `Tool execution failed: 401 Unauthorized` or `403 Forbidden`.
* **Diagnosis**: Check if `INTERNAL_AGENT_SECRET` matches across both `apps/api` and `services/agent`. Confirm system clocks are synchronized within 300 seconds (clock drift limit).
* **Mitigation**: Align secrets in Render environment variables; ensure internal DNS correctly resolves `API_INTERNAL_URL`.

---

## Process-Local Limitations & Distributed Boundaries
* **LangGraph State**: Checkpoints are maintained in-memory via `MemorySaver` in the single-instance Python service. Cross-instance synchronization or clustering is intentionally out of scope for the single-instance Render topology.
* **Replay Protection**: The HMAC timestamp and nonce protection in `InternalHmacGuard` uses process-local memory. Replay prevention operates per-instance and does not claim cluster-wide or distributed coordination across horizontal replicas.
