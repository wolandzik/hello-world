# Architecture Outline

## Stack choice
- **Frontend**: React + TypeScript (consider Next.js for SSR), using a drag-and-drop library for scheduling and a calendar component (e.g., FullCalendar). Command palette (Ctrl/Cmd+K) powered by a headless command framework.
- **Backend**: Node.js + Express with PostgreSQL. Prisma for schema and migrations. Background workers via BullMQ/Redis.
- **Auth**: Email + magic link for single-user simplicity; OAuth 2.0 for Google Calendar to obtain calendar scopes.
- **Deployment**: Frontend on Vercel/Netlify; backend on Fly.io/Render with managed PostgreSQL and Redis for jobs/timers.

## API surface
- `POST /tasks` create task; `GET /tasks` list with filters (scheduled/unscheduled, channel, status); `PATCH /tasks/:id` update; `DELETE /tasks/:id` archive/delete.
- `POST /tasks/:id/priority` update importance/urgency and recompute score.
- `POST /tasks/import` bulk import tasks from external tools/calendars; `GET /tasks/imports` review proposed imports.
- `POST /tasks/:id/subtasks` create subtask; `PATCH /subtasks/:id` update order/status.
- `POST /tasks/:id/recurrence` create/update recurrence rules; `POST /tasks/:id/rollover` force-roll unfinished work.
- `POST /timeblocks` create block; `PATCH /timeblocks/:id` update timing/status; `DELETE /timeblocks/:id` remove block.
- `POST /timeblocks/:id/confirm` mark as confirmed and sync to calendar; `POST /timeblocks/:id/suggest` auto-schedule within working hours.
- `POST /planning-sessions` start/complete daily/weekly planning; `POST /objectives` create weekly objectives; `POST /highlights` set daily highlights.
- `POST /focus-sessions` start/stop a focus timer and log actual_minutes; `POST /breaks` schedule breaks with reminders.
- `POST /sync/providers/google/connect` start OAuth; `POST /sync/providers/google/disconnect` revoke; `POST /sync/providers/google/webhook` receive pushes.

## Background jobs
- Poll Google Calendar for changes when webhooks are not available; backoff on errors.
- Reconcile conflicts by comparing app state vs. external changes and creating user-visible alerts.
- Nightly cleanup of expired tokens, rollover unfinished tasks at midnight, and archival of completed tasks beyond retention window.
- Auto-scheduling/rescheduling within working hours when conflicts are detected or when the user requests suggestions.
- Daily/weekly digests and planning reminders (respect morning/evening preferences).
- Import syncers to pull tasks from integrated tools and propose imports.

## Telemetry and logging
- Emit events for task created, priority updated, block scheduled, block completed, sync success/failure, focus session completed, recurrence/rollover applied, and planning session completed.
- Centralized structured logs; trace IDs propagated through API and jobs.
