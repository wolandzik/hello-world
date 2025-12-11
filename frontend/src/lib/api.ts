import {
  FocusSession,
  Highlight,
  Objective,
  PlanningSession,
  PlanningSessionType,
  ScheduledBreak,
  Task,
  TaskPriority,
  TaskStatus,
  Channel,
  TimeBlock,
  TimeBlockStatus,
  CalendarIntegrationStatus,
} from '../types';

let tasks: Task[] = [
  {
    id: 't-1',
    title: 'Review research notes',
    priority: 'high',
    status: 'in_progress',
    dueDate: new Date(Date.now() + 86400000).toISOString(),
  },
  {
    id: 't-2',
    title: 'Design onboarding flow',
    priority: 'medium',
    status: 'todo',
    dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
  },
  {
    id: 't-3',
    title: 'Ship patch release',
    priority: 'high',
    status: 'done',
    dueDate: new Date().toISOString(),
  },
];

let channels: Channel[] = [
  {
    id: 'c-1',
    userId: 'f1c3b317-1111-4b0c-9b44-2b2fd0d3f111',
    name: 'Deep work',
    visibility: 'private',
    color: '#8b5cf6',
    targetCalendarId: null,
  },
  {
    id: 'c-2',
    userId: 'f1c3b317-1111-4b0c-9b44-2b2fd0d3f111',
    name: 'Meetings',
    visibility: 'shared',
    color: '#22c55e',
    targetCalendarId: null,
  },
];

let timeBlocks: TimeBlock[] = [
  {
    id: 'b-1',
    title: 'Review research notes',
    taskId: 't-1',
    start: new Date().toISOString(),
    end: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    channelId: 'c-1',
    status: 'confirmed',
    provider: 'local',
  },
];

let planningSessions: PlanningSession[] = [
  {
    id: 'ps-1',
    userId: 'f1c3b317-1111-4b0c-9b44-2b2fd0d3f111',
    type: 'morning',
    context: 'work',
    status: 'in_progress',
    startedAt: new Date().toISOString(),
    highlightId: 'h-1',
    plannedTaskIds: ['t-1'],
  },
];

let highlights: Highlight[] = [
  {
    id: 'h-1',
    userId: 'f1c3b317-1111-4b0c-9b44-2b2fd0d3f111',
    title: 'Finish onboarding spec',
    date: new Date().toISOString().slice(0, 10),
    status: 'scheduled',
  },
];

let objectives: Objective[] = [
  {
    id: 'obj-1',
    userId: 'f1c3b317-1111-4b0c-9b44-2b2fd0d3f111',
    title: 'Ship onboarding beta',
    timeframe: 'this_week',
    successCriteria: '3 pilot users complete onboarding',
    status: 'active',
  },
];

let focusSessions: FocusSession[] = [
  {
    id: 'fs-1',
    userId: 'f1c3b317-1111-4b0c-9b44-2b2fd0d3f111',
    taskId: 't-1',
    plannedMinutes: 50,
    actualMinutes: 45,
    status: 'completed',
    startedAt: new Date(Date.now() - 50 * 60000).toISOString(),
    completedAt: new Date().toISOString(),
    goal: 'Write drafts',
    interruptions: 1,
  },
];

let breaks: ScheduledBreak[] = [];

let calendarIntegration: CalendarIntegrationStatus = {
  provider: 'google',
  status: 'disconnected',
  syncMode: 'polling',
  lastSyncedAt: null,
  calendarId: null,
};

const findFirstOpenSlot = (
  sortedBlocks: TimeBlock[],
  searchStart: Date,
  searchEnd: Date,
  preferredStartHour: number,
  preferredEndHour: number,
  durationMinutes: number
) => {
  const durationMs = durationMinutes * 60 * 1000;
  const cursorDay = new Date(searchStart);
  cursorDay.setHours(0, 0, 0, 0);

  while (cursorDay <= searchEnd) {
    const dayStart = new Date(cursorDay);
    dayStart.setHours(preferredStartHour, 0, 0, 0);
    const dayEnd = new Date(cursorDay);
    dayEnd.setHours(preferredEndHour, 0, 0, 0);

    const windowStart = new Date(Math.max(dayStart.getTime(), searchStart.getTime()));
    const windowEnd = new Date(Math.min(dayEnd.getTime(), searchEnd.getTime()));

    if (windowEnd > windowStart) {
      const dayBlocks = sortedBlocks.filter(
        (block) => new Date(block.start) < windowEnd && new Date(block.end) > windowStart
      );

      let cursor = windowStart;

      for (const block of dayBlocks) {
        const blockStart = new Date(block.start);
        const blockEnd = new Date(block.end);

        if (blockStart.getTime() - cursor.getTime() >= durationMs) {
          return { start: cursor, end: new Date(cursor.getTime() + durationMs) };
        }

        if (blockEnd > cursor) {
          cursor = blockEnd;
        }
      }

      if (windowEnd.getTime() - cursor.getTime() >= durationMs) {
        return { start: cursor, end: new Date(cursor.getTime() + durationMs) };
      }
    }

    cursorDay.setDate(cursorDay.getDate() + 1);
  }

  return null;
};

function simulateLatency<T>(data: T, delay = 120): Promise<T> {
  const clone = JSON.parse(JSON.stringify(data)) as T;
  return new Promise((resolve) => setTimeout(() => resolve(clone), delay));
}

function hasOverlap(a: Pick<TimeBlock, 'start' | 'end'>, b: Pick<TimeBlock, 'start' | 'end'>) {
  return new Date(a.start) < new Date(b.end) && new Date(a.end) > new Date(b.start);
}

function assertNoTimeBlockConflicts(candidate: TimeBlock, excludeId?: string) {
  const conflict = timeBlocks.find(
    (block) =>
      block.id !== excludeId && block.status !== 'cancelled' && hasOverlap(block, candidate)
  );

  if (conflict) {
    const error = new Error('Time block conflicts with another block');
    (error as Error & { conflict?: TimeBlock }).conflict = conflict;
    throw error;
  }
}

export async function fetchChannels(): Promise<Channel[]> {
  return simulateLatency(channels);
}

export async function createChannel(
  input: Omit<Channel, 'id'>
): Promise<Channel> {
  const channel: Channel = { ...input, id: crypto.randomUUID() };
  channels = [...channels, channel];
  return simulateLatency(channel);
}

export async function updateChannel(
  id: string,
  patch: Partial<Omit<Channel, 'id'>>
): Promise<Channel> {
  channels = channels.map((channel) =>
    channel.id === id ? { ...channel, ...patch } : channel
  );
  const updated = channels.find((channel) => channel.id === id)!;
  return simulateLatency(updated);
}

export async function fetchTasks(): Promise<Task[]> {
  return simulateLatency(tasks);
}

export async function fetchTimeBlocks(filters?: {
  channelId?: string | null;
  status?: TimeBlockStatus;
}): Promise<TimeBlock[]> {
  let results = [...timeBlocks];
  if (filters?.channelId) {
    results = results.filter((block) => block.channelId === filters.channelId);
  }
  if (filters?.status) {
    results = results.filter((block) => block.status === filters.status);
  }
  return simulateLatency(results);
}

export async function fetchCalendarStatus(): Promise<CalendarIntegrationStatus> {
  return simulateLatency(calendarIntegration);
}

export async function connectCalendar(
  _scopes: string[] = ['https://www.googleapis.com/auth/calendar.events']
): Promise<CalendarIntegrationStatus> {
  calendarIntegration = {
    ...calendarIntegration,
    status: 'connected',
    integrationId: calendarIntegration.integrationId ?? crypto.randomUUID(),
    lastSyncedAt: new Date().toISOString(),
  };
  return simulateLatency(calendarIntegration);
}

export async function disconnectCalendar(): Promise<CalendarIntegrationStatus> {
  calendarIntegration = {
    provider: 'google',
    status: 'disconnected',
    syncMode: 'polling',
    lastSyncedAt: null,
    calendarId: null,
  };
  return simulateLatency(calendarIntegration);
}

export async function pollCalendar(): Promise<{ synced: number; lastSyncedAt: string }> {
  const lastSyncedAt = new Date().toISOString();
  calendarIntegration = { ...calendarIntegration, status: 'connected', lastSyncedAt };
  const synced = Math.max(1, Math.floor(Math.random() * 3));
  return simulateLatency({ synced, lastSyncedAt });
}

export async function createTask(input: {
  title: string;
  priority: TaskPriority;
  status?: TaskStatus;
}): Promise<Task> {
  const task: Task = {
    id: crypto.randomUUID(),
    description: '',
    dueDate: new Date().toISOString(),
    status: input.status ?? 'todo',
    ...input,
  };
  tasks = [task, ...tasks];
  return simulateLatency(task);
}

export async function updateTask(
  id: string,
  patch: Partial<Task>
): Promise<Task> {
  tasks = tasks.map((task) => (task.id === id ? { ...task, ...patch } : task));
  const updated = tasks.find((task) => task.id === id)!;
  return simulateLatency(updated);
}

export async function createTimeBlock(
  input: Omit<TimeBlock, 'id' | 'status'> & { status?: TimeBlockStatus }
): Promise<TimeBlock> {
  const block: TimeBlock = {
    id: crypto.randomUUID(),
    status: input.status ?? 'tentative',
    provider: input.provider ?? 'local',
    ...input,
  };
  assertNoTimeBlockConflicts(block);
  timeBlocks = [...timeBlocks, block];
  return simulateLatency(block);
}

export async function updateTimeBlock(
  id: string,
  patch: Partial<TimeBlock>
): Promise<TimeBlock> {
  const existing = timeBlocks.find((block) => block.id === id);
  if (!existing) {
    throw new Error('Time block not found');
  }

  const updated: TimeBlock = {
    ...existing,
    ...patch,
  };

  assertNoTimeBlockConflicts(updated, id);

  timeBlocks = timeBlocks.map((block) => (block.id === id ? updated : block));
  return simulateLatency(updated);
}

export async function suggestTimeBlock(options: {
  taskId?: string;
  title?: string;
  channelId?: string | null;
  durationMinutes?: number;
  windowStart?: string;
  windowEnd?: string;
  preferredStartHour?: number;
  preferredEndHour?: number;
}): Promise<TimeBlock> {
  const {
    taskId,
    title,
    channelId,
    durationMinutes = 60,
    windowStart,
    windowEnd,
    preferredStartHour = 9,
    preferredEndHour = 17,
  } = options;

  const searchStart = windowStart ? new Date(windowStart) : new Date();
  const searchEnd = windowEnd ? new Date(windowEnd) : new Date(searchStart.getTime() + 7 * 86400000);
  const sorted = [...timeBlocks].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  const slot = findFirstOpenSlot(
    sorted,
    searchStart,
    searchEnd,
    preferredStartHour,
    preferredEndHour,
    durationMinutes
  );

  if (!slot) {
    throw new Error('No available time within the selected window');
  }

  const block: TimeBlock = {
    id: crypto.randomUUID(),
    title: title ?? 'Suggested block',
    taskId,
    channelId: channelId ?? undefined,
    start: slot.start.toISOString(),
    end: slot.end.toISOString(),
    status: 'tentative',
    provider: 'local',
  };

  assertNoTimeBlockConflicts(block);
  timeBlocks = [...timeBlocks, block];
  return simulateLatency(block);
}

export async function listPlanningSessions(): Promise<PlanningSession[]> {
  return simulateLatency(planningSessions);
}

export async function startPlanningSession(input: {
  userId: string;
  type: PlanningSessionType;
  context: 'work' | 'personal';
  scheduledFor?: string;
  plannedTaskIds?: string[];
  reflection?: string;
}): Promise<PlanningSession> {
  const session: PlanningSession = {
    id: crypto.randomUUID(),
    status: input.scheduledFor ? 'planned' : 'in_progress',
    startedAt: input.scheduledFor ?? new Date().toISOString(),
    ...input,
  };
  planningSessions = [session, ...planningSessions];
  return simulateLatency(session);
}

export async function completePlanningSession(
  id: string,
  patch: Partial<PlanningSession>
): Promise<PlanningSession> {
  planningSessions = planningSessions.map((session) =>
    session.id === id
      ? {
          ...session,
          ...patch,
          status: 'completed',
          completedAt: new Date().toISOString(),
        }
      : session
  );
  const completed = planningSessions.find((session) => session.id === id)!;
  return simulateLatency(completed);
}

export async function fetchHighlights(): Promise<Highlight[]> {
  return simulateLatency(highlights);
}

export async function createHighlight(
  input: Omit<Highlight, 'id' | 'status'>
): Promise<Highlight> {
  const highlight: Highlight = {
    id: crypto.randomUUID(),
    status: 'scheduled',
    ...input,
  };
  highlights = [highlight, ...highlights];
  return simulateLatency(highlight);
}

export async function fetchObjectives(): Promise<Objective[]> {
  return simulateLatency(objectives);
}

export async function createObjective(
  input: Omit<Objective, 'id' | 'status'>
): Promise<Objective> {
  const objective: Objective = {
    id: crypto.randomUUID(),
    status: 'planned',
    ...input,
  };
  objectives = [objective, ...objectives];
  return simulateLatency(objective);
}

export async function fetchFocusSessions(): Promise<FocusSession[]> {
  return simulateLatency(focusSessions);
}

export async function createFocusSession(
  input: Omit<FocusSession, 'id' | 'status'>
): Promise<FocusSession> {
  const session: FocusSession = {
    id: crypto.randomUUID(),
    status: 'active',
    startedAt: input.startedAt ?? new Date().toISOString(),
    interruptions: 0,
    ...input,
  };
  focusSessions = [session, ...focusSessions];
  return simulateLatency(session);
}

export async function completeFocusSession(
  id: string,
  input: Pick<FocusSession, 'actualMinutes'> & Partial<FocusSession>
): Promise<FocusSession> {
  focusSessions = focusSessions.map((session) =>
    session.id === id
      ? {
          ...session,
          ...input,
          status: 'completed',
          completedAt: new Date().toISOString(),
          interruptions: input.interruptions ?? session.interruptions,
        }
      : session
  );
  const session = focusSessions.find((item) => item.id === id)!;
  return simulateLatency(session);
}

export async function fetchBreaks(): Promise<ScheduledBreak[]> {
  return simulateLatency(breaks);
}

export async function createBreak(
  input: Omit<ScheduledBreak, 'id' | 'reminderSent'>
): Promise<ScheduledBreak> {
  const scheduledBreak: ScheduledBreak = {
    id: crypto.randomUUID(),
    reminderSent: false,
    ...input,
  };
  breaks = [scheduledBreak, ...breaks];
  return simulateLatency(scheduledBreak);
}
