# Calendar Integration Strategy

## Providers
- **Google Calendar**: OAuth 2.0 with incremental scopes (`https://www.googleapis.com/auth/calendar.events`). Prefer watch/webhook channels; fall back to polling if channel expires.
- **iCal**: Ingest via subscribed feed URL; outbound sync limited to read-only unless paired with CalDAV provider.
- **Channels/contexts**: Map channels to calendars; private channels stay local, shared channels push to their mapped provider calendar when available.

## OAuth flow (Google)
1. User starts connect flow; redirect to Google OAuth with calendar scope and offline access.
2. Store authorization code exchange result (access + refresh token) encrypted in the database; attach to `CalendarIntegration` row.
3. On success, fetch calendar list and select primary by default; allow user override.
4. Start a watch channel on the chosen calendar; persist channel ID and expiry in sync_state.

## Sync cadence
- **Webhooks**: Handle `POST /sync/providers/google/webhook` to ingest notifications; fetch changes using sync tokens.
- **Polling fallback**: Poll every 2 minutes when webhook is unavailable or expired; exponential backoff on failures.
- **iCal refresh**: Re-fetch feed every 15 minutes or when user requests manual refresh.
- **Task rollover**: Nightly job (local midnight) creates a new instance of unfinished tasks with carried-over actual time and re-schedules blocks into the next working day.

## Conflict resolution
- Use `etag`/`updated` fields to detect changes; last-write from the external calendar creates an in-app alert before overwriting.
- If a time block was moved externally, update local `TimeBlock` and mark as `tentative` with a banner prompting the user to confirm.
- Auto-rescheduler proposes new slots within working hours when conflicts or collisions are detected; user can accept to update event times.

## Auto-scheduling and focus
- Auto-scheduling service uses working hours, calendar availability, and task priority/estimated time to suggest blocks; supports multi-block scheduling for large tasks.
- Playlist/focus mode walks through scheduled tasks sequentially, starting focus timers and updating actual_minutes; pushes event updates on overruns.

## Error handling
- Auto-retry transient HTTP 5xx/429 with jittered backoff.
- On 401/invalid grant, mark integration as `reconnect_required` and notify the user; allow manual reconnect.
- Log webhook verification failures and ignore unverified payloads.
