# SoulSync 2.0 — API Contracts

## Primary Client Endpoints (Web → NestJS)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register new user account |
| `POST` | `/api/v1/auth/login` | Authenticate credentials and receive JWT |
| `GET` | `/api/v1/journal` | List user diary entries (paginated) |
| `POST` | `/api/v1/journal` | Create new TipTap JSON diary entry |
| `GET` | `/api/v1/journal/:id` | Fetch single diary entry |
| `GET` | `/api/v1/emotions/trends` | Fetch rolling emotion metrics (7d, 30d) |
| `GET` | `/api/v1/goals` | List active user wellness goals |
| `POST` | `/api/v1/goals` | Create a new user wellness goal |
| `POST` | `/api/v1/agent/chat` | Send message to Agent (returns SSE stream) |
| `POST` | `/api/v1/agent/approve-tool` | Submit human approval to resume paused LangGraph |
