# SoulSync 2.0 — Architecture Overview

SoulSync 2.0 is a decoupled, portfolio-grade AI Agent application designed for emotional journaling and reflective companion workflows.

## System Topology

```
Next.js 15 (React 19) → Vercel
      ↓ (REST / SSE with x-correlation-id)
NestJS 11 Gateway      → Render (Docker Web Service)
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
  * Purpose: Validates that critical configuration secrets (`INTERNAL_AGENT_SECRET`, `INTERNAL_GATEWAY_URL`) are present and valid without making expensive or unbounded external model API calls.

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
* **Mitigation**: Align secrets in Render environment variables; ensure internal DNS correctly resolves `INTERNAL_GATEWAY_URL`.

---

## Process-Local Limitations & Distributed Boundaries
* **LangGraph State**: Checkpoints are maintained in-memory via `MemorySaver` in the single-instance Python service. Cross-instance synchronization or clustering is intentionally out of scope for the single-instance Render topology.
* **Replay Protection**: The HMAC timestamp and nonce protection in `InternalHmacGuard` uses process-local memory. Replay prevention operates per-instance and does not claim cluster-wide or distributed coordination across horizontal replicas.

---

## Containerization, Orchestration & CI/CD Architecture (Phase 11)

### 1. Multi-Stage Docker Builds
* **NestJS Core API (`apps/api/Dockerfile`)**:
  * Base: `node:22-slim` with pnpm 10.5.2 enabled via Corepack. Installs system `openssl` for Prisma engine binaries.
  * Build context: Monorepo root (`.`), allowing access to workspace manifests and internal dependencies (`@soulsync/contracts`, `@soulsync/database`, `@soulsync/shared`).
  * Layering: Generates Prisma Client (`packages/database`), compiles shared contracts, compiles NestJS API into `dist/`, and prunes development dependencies (`pnpm prune --prod`).
  * Runner: Runs under non-root user `node` on port 4000 with unauthenticated liveness `HEALTHCHECK` probing `/api/v1/healthz`.
* **FastAPI Python Agent (`services/agent/Dockerfile`)**:
  * Base: `python:3.12-slim`.
  * Context: `services/agent`, isolating Python assets.
  * Dependency resolution: Installs `uv` and synchronizes pinned dependencies with `uv pip install --system --no-cache -r pyproject.toml`.
  * Entrypoint: Executes `uvicorn app.main:app` bound to `0.0.0.0:8000`.

### 2. Local Docker Compose (`infrastructure/docker-compose.yml`)
* **Database-Only Default**: By default, `docker compose up -d` starts only `soulsync-postgres` (PostgreSQL 16 + pgvector) with persistent volume `postgres_data`. This avoids memory exhaustion on development machines.
* **Port Parameterization**: Host port is parameterized as `"${POSTGRES_PORT:-5432}:5432"` to resolve host port 5432 conflicts without altering the configuration file.
* **Optional Full-Stack Profile**: Running `docker compose --profile full up -d` brings up the complete containerized stack: `postgres:5432`, `api:4000`, and `agent:8000` connected over an internal Docker bridge network with health-based startup dependencies.
* **Local Fallback Secrets**: Development fallback secrets explicitly contain `do-not-use-in-production` and are strictly rejected by production Zod and Pydantic validation schemas.

### 3. Render Blueprint Specification (`infrastructure/render.yaml`)
* **API Service (`soulsync-api`)**: Web service configured with `runtime: docker`, `dockerfilePath: apps/api/Dockerfile`, and `dockerContext: .`.
* **Agent Service (`soulsync-agent`)**: Web service configured with `runtime: docker`, `dockerfilePath: services/agent/Dockerfile`, and `dockerContext: services/agent`.
* **Shared HMAC Secret Group**: Uses Render `envVarGroups: - name: soulsync-shared-secrets` with `key: INTERNAL_AGENT_SECRET, generateValue: true`. Both services link to this group, ensuring an identical generated 256-bit HMAC secret.
* **Least-Privilege Database Access**: `DATABASE_URL` is injected exclusively into `soulsync-api` from managed database `soulsync-db`. The agent service receives zero database credentials, querying data strictly via authenticated HTTP requests to the NestJS Tool Gateway.
* **Private Network Routing**: Services communicate internally via `AGENT_SERVICE_URL: http://soulsync-agent:8000` and `INTERNAL_GATEWAY_URL: http://soulsync-api:10000/internal/v1/tools/execute`.
* **Operator Configuration**: Production secrets `CORS_ORIGIN` and `OPENAI_API_KEY` are designated `sync: false` to be supplied securely via the Render Dashboard.

### 4. GitHub Actions CI Pipeline (`.github/workflows/ci.yml`)
* **Triggers & Permissions**: Runs on pushes to `main` and pull requests targeting `main` with `permissions: contents: read` and concurrency cancellation.
* **Parallel Automated Jobs**:
  1. `node-monorepo`: Sets up Node 22 and pnpm 10.5.2 with caching, generates Prisma client, compiles contracts, runs `pnpm -r check-types` across all 6 packages, and executes all 84 automated unit tests.
  2. `python-agent`: Sets up Python 3.12 and `setup-uv@v5` with caching, runs `uv sync --frozen`, and executes all 54 safety, triage, and streaming tests via `pytest`.
  3. `docker-build`: Builds both API and Agent Docker images in parallel to verify container builds and context resolution without pushing to a registry.

### 5. Verification Boundaries
* **Locally Verified**: 138 automated unit/safety tests passed, 6 workspace packages typechecked, both Docker images built successfully with exit code 0, and YAML syntax validated.
* **Pending Remote Execution**: Cloud execution on GitHub-hosted runners initiates upon pushing to remote; live infrastructure provisioning, automated secret generation, and internal private DNS routing execute during Phase 12 deployment on Render.
