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
  TimeBlock,
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

let timeBlocks: TimeBlock[] = [
  {
    id: 'b-1',
    title: 'Review research notes',
    taskId: 't-1',
    start: new Date().toISOString(),
    end: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  },
];

let planningSessions: PlanningSession[] = [
  {
    id: 'ps-1',
    userId: 'f1c3b317-1111-4b0c-9b44-2b2fd0d3f111',
    type: 'morning',
    context: 'work',
    status: 'completed',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    highlightId: 'h-1',
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
  },
];

let breaks: ScheduledBreak[] = [];

function simulateLatency<T>(data: T, delay = 120): Promise<T> {
  const clone = JSON.parse(JSON.stringify(data)) as T;
  return new Promise((resolve) => setTimeout(() => resolve(clone), delay));
}

export async function fetchTasks(): Promise<Task[]> {
  return simulateLatency(tasks);
}

export async function fetchTimeBlocks(): Promise<TimeBlock[]> {
  return simulateLatency(timeBlocks);
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
  input: Omit<TimeBlock, 'id'>
): Promise<TimeBlock> {
  const block: TimeBlock = { ...input, id: crypto.randomUUID() };
  timeBlocks = [...timeBlocks, block];
  return simulateLatency(block);
}

export async function updateTimeBlock(
  id: string,
  patch: Partial<TimeBlock>
): Promise<TimeBlock> {
  timeBlocks = timeBlocks.map((block) =>
    block.id === id ? { ...block, ...patch } : block
  );
  const updated = timeBlocks.find((block) => block.id === id)!;
  return simulateLatency(updated);
}

export async function listPlanningSessions(): Promise<PlanningSession[]> {
  return simulateLatency(planningSessions);
}

export async function startPlanningSession(input: {
  userId: string;
  type: PlanningSessionType;
  context: 'work' | 'personal';
  scheduledFor?: string;
}): Promise<PlanningSession> {
  const session: PlanningSession = {
    id: crypto.randomUUID(),
    status: 'in_progress',
    startedAt: new Date().toISOString(),
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
    startedAt: new Date().toISOString(),
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
