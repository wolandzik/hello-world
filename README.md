# Task Timeboxing App

This project aims to build a single-user web app for managing tasks, prioritizing them, and timeboxing into a calendar with Google Calendar and iCal integration. It also includes guided daily/weekly planning, focus/playlist sessions, imports, and auto-scheduling to fit work inside user-defined hours.

## Documentation
- Product requirements: `docs/product/requirements.md`
- Data model: `docs/tech/data-model.md`
- Architecture: `docs/tech/architecture.md`
- Calendar integration: `docs/tech/calendar.md`
- MVP milestones: `docs/project/milestones.md`

## Development Setup

This repository is organized as an npm workspace with separate `frontend` (Next.js + TypeScript) and `backend` (Express + TypeScript) packages.

### Prerequisites
- Node.js 20+
- npm 10+
- Docker (for the provided PostgreSQL and Redis services)

### Install dependencies

```bash
npm install
```

### Run quality checks

```bash
npm run lint
npm run type-check
npm test
```

### Package-specific commands
- Frontend: `npm run dev --workspace frontend`
- Backend: `npm run dev --workspace backend`

### Tooling
- Formatting and linting are enforced via Prettier, ESLint, and `lint-staged` (Husky pre-commit hook).
- GitHub Actions CI runs lint, type-check, and test on pushes and pull requests.
- `docker-compose.yml` provides PostgreSQL and Redis services for local development.
