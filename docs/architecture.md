# SoulSync 2.0 — Architecture Overview

SoulSync 2.0 is a decoupled, portfolio-grade AI Agent application designed for emotional journaling and reflective companion workflows.

## System Topology

```
Next.js 15 (React 19) → Vercel
      ↓ (REST / SSE)
NestJS 11 Gateway      → Render (Node Web Service)
      ↓ (Internal HMAC)
FastAPI + LangGraph    → Render (Docker Web Service)
      ↓ (SQL & Vectors)
PostgreSQL 16 + pgvector → Render Managed DB
```

## Core Principles
1. **API Owns Business Access:** The NestJS API is the sole gatekeeper of user data and database transactions.
2. **Zero-Trust Tool Sandbox:** The Python Agent interacts with user data only through scoped tool endpoints enforcing `userId`.
3. **Structured TipTap AST:** Journal content is stored as ProseMirror JSON trees, completely preventing Stored XSS.
4. **Human-in-the-Loop Write Actions:** Mutating operations (e.g. creating wellness goals) pause execution and require explicit user approval.
5. **No AWS Lock-In:** All services run in standard containers on Vercel and Render within a realistic ~$30/mo budget, fully portable to AWS later.
