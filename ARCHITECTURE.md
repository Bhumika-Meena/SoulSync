# SoulSync — Architecture

## Overview

SoulSync is an AI-powered emotional journaling platform. Users write diary entries; the system detects emotions, tracks transitions, and responds empathetically without acting as a medical tool.

## Principles

- **Privacy**: Never send full diary history to the LLM. Only: today's entry + last N emotions + latest weekly summary.
- **Heavy work off main thread**: Weekly summaries, notifications, playlist generation → async jobs.
- **DB performance**: Queries keyed by `user_id` + `created_at`; composite indexes where needed.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Next.js App (Node)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐
│  │   App       │  │   API       │  │   Server Actions /          │
│  │   Router    │  │   Routes    │  │   Route Handlers            │
│  │   (UI)      │  │             │  │   (auth, diary, emotions)   │
│  └──────┬──────┘  └──────┬──────┘  └──────────────┬──────────────┘
│         │                │                        │                 │
│         └────────────────┼────────────────────────┘                 │
│                          │                                          │
│  ┌───────────────────────▼───────────────────────┐                  │
│  │              lib/ (backend logic)              │                  │
│  │  auth | db | theme | llm | jobs | notifications │                  │
│  └───────────────────────┬───────────────────────┘                  │
└──────────────────────────┼─────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   ┌──────────┐     ┌──────────────┐   ┌─────────────┐
   │ PostgreSQL│     │ External LLM  │   │ Job Queue   │
   │ (Prisma)  │     │ (streaming)   │   │ (async)     │
   └──────────┘     └──────────────┘   └─────────────┘
```

## Folder Structure

```
soulsync/
├── app/                    # Next.js App Router (front-end entry points)
│   ├── api/                # API routes (auth, diary, emotions, jobs)
│   ├── (auth)/             # Auth pages (login, signup, callback)
│   ├── (dashboard)/        # Protected app (journal, history, settings)
│   ├── layout.tsx
│   └── page.tsx            # Landing
├── components/              # React UI (front-end)
│   ├── ui/                 # Base components
│   ├── journal/            # Diary entry, editor, history
│   ├── emotions/           # Emotion display, transitions
│   ├── theme/              # Theme provider, emotion-adaptive wrapper
│   └── layout/             # Shell, nav, safety disclaimer
├── lib/                    # Backend & shared logic
│   ├── auth/               # NextAuth config, session, callbacks
│   ├── db/                 # Prisma client, queries (indexed by user_id + created_at)
│   ├── llm/                # LLM client, context builder (today + last emotions + latest summary)
│   ├── theme/              # Theme tokens, emotion → theme mapping
│   ├── jobs/               # Async job definitions (weekly summary, notifications)
│   └── notifications/     # Mood-based notification logic
├── prisma/
│   └── schema.prisma
├── public/
├── styles/
└── ARCHITECTURE.md
```

## Data Model

### User

- Id, email, name, image (OAuth), emailVerified, etc.
- Optional: notification preferences, timezone for summaries.

### DiaryEntry

- id, userId, content (text), createdAt.
- Index: `(userId, createdAt DESC)` for “recent entries” and “today”.

### EmotionAnalysis

- id, diaryEntryId, userId (denormalized for fast user-scoped queries).
- primaryEmotion, secondaryEmotion, intensity (e.g. 0–1 or 1–5).
- createdAt.
- Index: `(userId, createdAt DESC)` so we can fetch “last few emotions” without loading full history.

### WeeklySummary

- id, userId, weekStart (date), content (summary text), createdAt.
- Index: `(userId, weekStart DESC)` to fetch “latest weekly summary” for LLM context.

## LLM Context (Strict)

- **Allowed**:
  - Today’s diary entry (if any).
  - Last K emotions (e.g. 5–10) — from EmotionAnalysis, not full entries.
  - Latest weekly summary (one document).
- **Never**: Full diary history or arbitrary past entry text.

## Auth

- NextAuth with Email (magic link or password) + Google OAuth.
- Session in JWT or DB; protected routes and API checks via middleware/session.

## Theme

- Base: pastel palette (background, cards, secondary, AI responses, highlights, primary buttons).
- Emotion-adaptive: calm → mint/blue; sad → lavender; happy → cream/peach; anxious → mint; angry → muted. Changes are subtle; readability first.

## Async Jobs

- Weekly summary generation (per user, after week end).
- Mood-based notifications (scheduled or event-driven).
- Optional: playlist generation (Spotify) — same job layer.

## Safety

- In-app disclaimer: SoulSync is not a medical or therapeutic tool; for serious distress users should seek professional help.
- No diagnosis or treatment claims; supportive, empathetic responses only.

## Deployment (AWS)

- Next.js on EC2 (Node) or ECS, behind ALB.
- PostgreSQL on RDS; connection string via env.
- Secrets in AWS Secrets Manager or env (no committed secrets).

---

Next steps in implementation: Auth → Theme → Diary + Emotion flow.
