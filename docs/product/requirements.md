# Product Requirements

## Target
- Single-user web app.
- Manages the user's own calendar while integrating with Google Calendar and iCal feeds.

## Core user stories
- As a user, I can create and edit tasks quickly via button, keyboard shortcut, or a global command palette; I can also import tasks from connected tools/calendars into backlogs.
- As a user, I can set priority on tasks using weighted levels and sort by it.
- As a user, I can estimate duration, planned time, and due dates so scheduling is realistic.
- As a user, I can add rich notes, subtasks, and channels/contexts for grouping, privacy, or routing to specific calendars.
- As a user, I can timebox tasks by dragging them into a calendar view and resizing blocks; tasks can be scheduled in multiple blocks and moved easily.
- As a user, I can see conflicts between time blocks and resolve or auto-reschedule them within my working hours.
- As a user, I can run focus sessions with timers that log actual time and update task progress.
- As a user, I can set tasks to recur on specific days and have unfinished tasks roll over automatically at midnight while keeping logged time.
- As a user, I can sync scheduled blocks to my primary calendar and see updates pulled from Google Calendar/iCal; I can temporarily pause sync or disconnect a provider.

## Planning rituals and views
- Guided daily planning ritual prompts me (morning or evening) to review yesterday, pull meetings, select backlog tasks, defer non-essential work, and order my day.
- I can run multiple planning sessions per day (e.g., work and personal) and trigger an evening planning mode after 3 p.m.
- I can mark daily highlights (top priorities) and set weekly objectives with a weekly review to reflect and adjust.
- I can navigate across Today, daily, weekly, backlog, archive, and calendar views; a focus mode and focus bar keep the current task visible.
- I can schedule breaks between tasks with defaults and reminders.

## Non-functional requirements
- OAuth for Google Calendar; token storage must be encrypted at rest.
- Sync latency target: under 2 minutes for new or updated blocks when polling; webhook updates should be near-real-time where supported.
- Offline tolerance: cache last task list and allow drafts that sync when back online.
- Notifications for upcoming blocks, failed syncs, daily/weekly digests, and planning reminders (morning or evening).

## Success metrics
- Time-to-first-schedule under 3 minutes for a new user.
- 90% of sync attempts succeed without user intervention.
- Drag-and-drop scheduling latency under 150 ms frame budget.
