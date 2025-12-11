# Backend

## Environment
Copy `.env.example` to `.env` and adjust as needed:

```
cp backend/.env.example backend/.env
```

- `DATABASE_URL` points at PostgreSQL (defaults to the Compose service).
- `REDIS_URL` points at Redis for future job scheduling/heartbeat checks.
- `HEALTHCHECK_SKIP_DEPENDENCIES` skips external health probes (useful in unit tests/CI).

## Local services
`docker-compose.yml` provides PostgreSQL and Redis:

```
docker compose up -d postgres redis
```

## Migrations and schema
Prisma metadata lives in `prisma/schema.prisma`, with the initial migration under `prisma/migrations/0001_init`.

Common commands:

- Generate the Prisma client after schema changes:
  ```
  npm run db:generate --workspace backend
  ```
- Create and apply migrations (requires a reachable database):
  ```
  npm run db:migrate --workspace backend
  ```
- Seed the development database with a default user and sample data:
  ```
  npm run db:seed --workspace backend
  ```

If you prefer to scope commands to the backend directory instead of workspaces, run them from `backend/` without the `--workspace` flag.

## Health checks and jobs
- `GET /health` reports dependency readiness with `db` and `redis` statuses and degrades when they are unavailable.
- A lightweight heartbeat job logs Redis reachability every minute on startup (disabled in test environments).
- A nightly rollover job carries incomplete tasks forward to today and records a `rollover_state` entry so midnight rituals keep the backlog fresh.
- A digest job runs periodically to surface counts of tasks due today and stale calendar syncs for observability dashboards.

## Tasks API and prioritization
- `POST /tasks` creates a task with optional `priorityLevel` (1-5), `importance`, and `urgency`. If a `priorityScore` is not
  provided, the API computes one using `priorityScore = (importance * 0.6) + (urgency * 0.4)`.
- `GET /tasks` lists tasks for a user with filters for `status`, `channelId`, and `scheduled` (scheduled/unscheduled). Results
  default to sorting by priority score (nulls last), then due date, then creation time; override with `sortBy` and
  `sortDirection`.
- `PATCH /tasks/:id` updates core fields; `POST /tasks/:id/priority` is a focused endpoint for adjusting priority inputs.

## Timeboxing and channels
- `POST /channels` and `GET /channels` manage channel metadata (color, visibility, target calendar) scoped to a user.
- `POST /timeblocks` accepts `channelId` and rejects overlaps with existing blocks for the user with `409` conflict errors.
- `GET /timeblocks` supports filters for `status`, `taskId`, `channelId`, and date ranges; updates will also check conflicts
  before saving.
- `POST /timeblocks/suggest` auto-schedules the next open slot within working hours (defaults to 9am-5pm, 7-day window) and
  returns the created tentative block.

## Observability and audit logging
- Each task mutation writes an `audit_logs` record with the user ID, action, and metadata for traceability.
- Telemetry events are emitted for key flows (task changes, syncs, digests) with request IDs to help correlate logs.

## Calendar sync
- `POST /sync/providers/google/connect` stores OAuth tokens and scopes; `POST /sync/providers/google/disconnect` removes the
  integration.
- `GET /sync/providers/google/status` reports whether Google Calendar is connected and when it last synced.
- `POST /sync/providers/google/poll` accepts a batch of calendar events (id, start/end, optional calendar ID) and upserts
  time blocks linked to channel mappings and the provider’s event IDs.

## Planning rituals and focus mode
- `POST /planning-sessions` starts a morning/evening/weekly ritual, optionally linking planned task IDs so the tasks record the
  session ID in `planned_sessions`.
- `PATCH /planning-sessions/:id/complete` logs reflections, boosts a highlight task to the highest priority, and activates any
  linked objectives.
- `POST /focus-sessions` starts a timed focus block (optionally reserving a tentative time block on a channel) and returns the
  active session payload.
- `PATCH /focus-sessions/:id/complete` finalizes the session with actual minutes and merges summaries/interruption counts while
  rolling the effort into the linked task’s `actual_minutes`.
