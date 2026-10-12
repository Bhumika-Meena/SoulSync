# SoulSync 2.0 — AI-Powered Reflective Journaling Platform

SoulSync 2.0 is an emotionally-attuned journaling platform and reflective AI Agent companion. It enables users to maintain a daily journal, track affective states, identify multi-day emotional patterns, and receive proactive, empathetic guidance.

## Architecture

SoulSync 2.0 is architected as a decoupled, multi-language monorepo:

```text
soul-sync/
├── apps/
│   ├── web/          # Next.js 15 (React 19, TipTap, Tailwind CSS, shadcn/ui)
│   └── api/          # NestJS 11 Application Gateway (Domain rules & Tool execution)
├── services/
│   └── agent/        # Python 3.12 (FastAPI + LangGraph state machine)
├── packages/
│   ├── contracts/    # Shared Zod schemas & DTO contracts
│   ├── ui/           # Shared design tokens & UI library
│   └── shared/       # Cross-cutting constants & utilities
├── infrastructure/   # Docker Compose (PostgreSQL 16 + pgvector) & Render blueprints
└── docs/             # Architecture, API specs, and agent protocols
```

## Development Quick Start

### 1. Prerequisites
- **Node.js**: v22 LTS
- **Package Manager**: `pnpm` (v10.5.2 locked via Corepack: `corepack enable && corepack prepare pnpm@10.5.2 --activate`)
- **Python**: v3.12 (managed via `uv`)
- **Docker**: Docker Desktop or Engine with WSL 2

### 2. Environment Configuration
Copy the template configuration:
```bash
cp .env.example .env
```

> [!IMPORTANT]
> The fallback secrets in `.env.example` and Compose (`soulsync-development-jwt-secret-do-not-use-in-production` and `soulsync-internal-agent-secret-do-not-use-in-production`) are strictly for local development. Production schema validation rejects these default secrets and requires keys of at least 32 characters.

### 3. Start Local Database (PostgreSQL 16 + pgvector)
By default, Docker Compose starts only the database service to conserve host memory:
```bash
docker compose -f infrastructure/docker-compose.yml up -d
```
*Port Conflicts:* If host port 5432 is already bound by a local PostgreSQL installation, set `POSTGRES_PORT=5433` (or another available port) in `.env` before launching Compose.

### 4. Install Dependencies & Build Packages
```bash
pnpm install --frozen-lockfile
pnpm --filter @soulsync/database db:generate
pnpm --filter @soulsync/contracts build
```

### 5. Run Services Locally
```bash
# Terminal 1: NestJS API Gateway (port 4000)
pnpm dev:api

# Terminal 2: Next.js Web Frontend (port 3000)
pnpm dev:web

# Terminal 3: FastAPI Python Agent (port 8000)
cd services/agent
uv sync --frozen
uv run uvicorn app.main:app --reload --port 8000
```
*Note:* Running `pnpm dev` from the root starts the web and API workspaces concurrently via Turborepo.

---

## Docker Containerization & Local Orchestration

### Building Production Docker Images
To build or validate production container images locally:
```bash
# 1. NestJS Core API (Multi-stage build from monorepo root)
docker build -f apps/api/Dockerfile -t soulsync-api:local .

# 2. FastAPI Python Agent (Isolated context)
docker build -f services/agent/Dockerfile -t soulsync-agent:local services/agent
```

### Optional Full-Stack Local Containers
For full-stack container integration testing:
```bash
docker compose -f infrastructure/docker-compose.yml --profile full up -d
```
This starts `soulsync-postgres` (5432), `soulsync-api` (4000), and `soulsync-agent` (8000) connected via internal Docker DNS (`postgres:5432`, `api:4000`, `agent:8000`).

> [!TIP]
> Running all applications inside Docker containers simultaneously increases memory and CPU overhead. On development machines with limited RAM (e.g. 8 GB), the default database-only workflow (`docker compose ... up -d`) with host-run Node/Python processes is strongly recommended for daily development.

---

## CI/CD & Deployment Blueprint

### GitHub Actions CI (`.github/workflows/ci.yml`)
Automated quality checks run on every push and pull request targeting `main`:
1. **Node Monorepo Job:** Sets up Node 22 and pnpm 10.5.2 with caching, generates the Prisma client, compiles contracts, runs `pnpm -r check-types` across all 6 packages, and executes all 84 automated unit tests.
2. **Python Agent Job:** Sets up Python 3.12 with `uv` caching, synchronizes pinned dependencies from `uv.lock`, and runs all 54 safety, triage, and streaming tests via `pytest`.
3. **Docker Verification Job:** Builds both container images in parallel to ensure build contexts and workspace dependencies remain valid without pushing to a registry.

### Render Cloud Deployment Alignment (`infrastructure/render.yaml`)
The Render Blueprint defines production deployment for backend services:
- **`soulsync-api`**: Containerized web service (`runtime: docker`, `apps/api/Dockerfile`, context `.`).
- **`soulsync-agent`**: Containerized web service (`runtime: docker`, `services/agent/Dockerfile`, context `services/agent`).
- **Shared HMAC Secret:** Uses Render `envVarGroups: soulsync-shared-secrets` to automatically generate and inject an identical 256-bit `INTERNAL_AGENT_SECRET` into both services.
- **Least-Privilege Database Access:** `DATABASE_URL` is provided exclusively to `soulsync-api`. The agent accesses user data only via authenticated HTTP requests to the NestJS Tool Gateway.
- **Operator-Provided Secrets:** `CORS_ORIGIN` (eventual Vercel web URL) and `OPENAI_API_KEY` are designated `sync: false` to be configured securely in the Render dashboard.

*Note:* Cloud execution of the GitHub Actions workflow initiates upon pushing to remote; live cloud infrastructure provisioning is reserved for Phase 12.

---

## Documentation
* [Architecture Blueprint](docs/architecture.md)
* [API Contracts](docs/api-contracts.md)
* [Agent Protocol](docs/agent-protocol.md)
* [Implementation Roadmap](docs/phases.md)

## Safety Notice
SoulSync is not a medical, clinical, or therapeutic diagnostic tool. An in-app disclaimer and deterministic safety triaging route users in acute distress to certified emergency crisis resources (such as the 988 Suicide & Crisis Lifeline).
