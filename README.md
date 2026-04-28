# SoulSync

AI-powered emotional journaling platform. Write daily entries, get emotion detection, empathetic streaming responses, and weekly summaries—with a strict privacy rule: the LLM only sees today's entry, last few emotions, and the latest weekly summary.

## Stack

- **Next.js 15** (App Router, Node runtime)
- **Tailwind CSS** (pastel theme, emotion-adaptive)
- **PostgreSQL** (Prisma, indexes on `user_id` + `created_at`)
- **NextAuth** (Email + Google OAuth)
- **External LLM** (OpenAI streaming; configurable)

## Setup

1. **Clone and install**

   ```bash
   cd "Major Project (soulsync)"
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env` and set:

   - `DATABASE_URL` — PostgreSQL connection string (RDS-compatible)
   - `NEXTAUTH_URL` — e.g. `http://localhost:3000`
   - `NEXTAUTH_SECRET` — e.g. `openssl rand -base64 32`
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — for Google sign-in
   - `OPENAI_API_KEY` — for emotion detection and empathetic responses (optional; stub used if missing)

3. **Database**

   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Project layout

- `app/` — App Router (pages, API routes)
- `components/` — React UI
- `lib/` — Backend logic: `auth`, `db`, `theme`, `llm`, (future: `jobs`, `notifications`)
- `prisma/` — Schema and migrations

See **ARCHITECTURE.md** for data model, LLM context rules, and deployment notes.

## Safety

SoulSync is not a medical or therapeutic tool. A disclaimer is shown in the app; for serious distress, users should seek professional help.
