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
