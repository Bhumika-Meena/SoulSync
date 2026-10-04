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

## Quick Start (Phase 0)

1. **Local Database (PostgreSQL + pgvector)**
   ```bash
   docker compose -f infrastructure/docker-compose.yml up -d
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   ```

3. **Workspace Scripts**
   ```bash
   npm run dev:web    # Runs Next.js frontend (apps/web)
   npm run dev:api    # Runs NestJS API gateway (apps/api)
   ```

## Documentation
* [Architecture Blueprint](docs/architecture.md)
* [API Contracts](docs/api-contracts.md)
* [Agent Protocol](docs/agent-protocol.md)
* [Implementation Roadmap](docs/phases.md)

## Safety Notice
SoulSync is not a medical, clinical, or therapeutic diagnostic tool. An in-app disclaimer and deterministic safety triaging route users in acute distress to certified emergency crisis resources (such as the 988 Suicide & Crisis Lifeline).
