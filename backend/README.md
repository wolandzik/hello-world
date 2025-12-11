# Backend

## Database setup
The service uses PostgreSQL via Prisma. Provide a connection string in `DATABASE_URL`, for example:

```
DATABASE_URL="postgresql://user:password@localhost:5432/app_db?schema=public"
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

## Environment variables

The service expects the following environment variables for calendar integration and background jobs:

- `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`: OAuth 2.0 client credentials for Google.
- `GOOGLE_OAUTH_REDIRECT_URI`: Redirect URI for the OAuth consent flow (defaults to `http://localhost:3000/api/auth/google/callback`).
- `GOOGLE_OAUTH_DISCONNECT_REDIRECT_URI`: Redirect URI used after revoking access (defaults to `http://localhost:3000/settings/integrations`).
- `REDIS_URL`: Connection string for Redis, used by BullMQ queues (defaults to `redis://localhost:6379`).

## Background jobs

BullMQ + Redis power calendar sync queues. The `calendar_sync` queue ships with a placeholder worker that can be extended to poll Google Calendar or process webhook notifications.
