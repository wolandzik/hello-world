# Data Model

## Entities
- **User**: id, email, display_name, settings (time zone, working hours), onboarding_state.
- **Task**: id, user_id (FK), title, rich_notes, status (todo/in-progress/done), priority_score, priority_level (1-5), due_at, planned_minutes, estimated_minutes, actual_minutes, channel_id (FK), planned_sessions (array of planning_session_id), recurrence_rule (RRULE), rollover_state (carried_from_date, rolled_minutes), labels (array), created_at, updated_at.
- **Subtask**: id, task_id (FK), title, status, order, created_at, updated_at.
- **TaskImport**: id, user_id (FK), source (calendar/tool), source_ref, payload (JSONB), task_id (FK nullable until accepted), state (proposed/accepted/ignored), created_at.
- **TimeBlock**: id, user_id (FK), task_id (FK, nullable for unscheduled blocks), start_at, end_at, status (tentative/confirmed/completed/cancelled), location, notes, calendar_event_id, provider (google/ical/local), recurrence_rule (optional), created_at, updated_at.
- **Channel**: id, user_id (FK), name, visibility (private/shared), target_calendar_id (nullable), color, created_at, updated_at.
- **PlanningSession**: id, user_id (FK), type (morning/evening/weekly/custom), started_at, completed_at, context (work/personal), source (auto/manual), notes.
- **Objective**: id, user_id (FK), type (weekly/objective), title, description, target_week, status, created_at, updated_at.
- **FocusSession**: id, user_id (FK), task_id (FK), start_at, end_at, planned_minutes, actual_minutes, status (active/completed/cancelled), interruptions (JSONB), created_at.
- **CalendarIntegration**: id, user_id (FK), provider (google/ical), access_token, refresh_token, expires_at, sync_state (last_sync_at, cursor), sync_mode (polling/webhook), calendar_id.
- **AuditLog**: id, user_id (FK), action, entity_type, entity_id, metadata (JSONB), created_at.

## Prioritization
- Priority levels: 1 (lowest) to 5 (highest); default is 3.
- Suggested weighted score: `priority_score = (importance * 0.6) + (urgency * 0.4)`, both on a 1-5 scale.
- Sorting defaults to priority_score desc, then due_at asc; backlog auto-sorts by scheduled start if timeboxed.

## Indexing
- Tasks: indexes on (user_id, status), (user_id, priority_score desc), (user_id, due_at), (user_id, channel_id), and GIN on labels for filtering.
- Subtasks: (task_id, order).
- TimeBlocks: indexes on (user_id, start_at, end_at) to surface conflicts quickly.
- PlanningSession: (user_id, started_at desc) for ritual history.
- FocusSession: (user_id, start_at desc) to show recent focus work.
- CalendarIntegration: index on (user_id, provider) for lookups during sync.
