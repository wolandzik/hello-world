export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in_progress' | 'done';

export type Task = {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
};

export type TimeBlockStatus =
  | 'tentative'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

export type TimeBlock = {
  id: string;
  title: string;
  taskId?: string;
  channelId?: string | null;
  start: string;
  end: string;
  status: TimeBlockStatus;
  location?: string;
  notes?: string;
  provider?: 'google' | 'ical' | 'local';
  calendarEventId?: string | null;
};

export type ChannelVisibility = 'private' | 'shared';

export type Channel = {
  id: string;
  userId: string;
  name: string;
  visibility: ChannelVisibility;
  targetCalendarId?: string | null;
  color?: string | null;
};

export type PlanningSessionType = 'morning' | 'evening' | 'weekly' | 'custom';
export type PlanningSessionStatus = 'in_progress' | 'completed' | 'planned';

export type PlanningSession = {
  id: string;
  userId: string;
  type: PlanningSessionType;
  context: 'work' | 'personal';
  status: PlanningSessionStatus;
  scheduledFor?: string;
  startedAt?: string;
  completedAt?: string;
  reflection?: string;
  highlightId?: string;
  plannedTaskIds?: string[];
  objectiveIds?: string[];
};

export type Highlight = {
  id: string;
  userId: string;
  title: string;
  date: string;
  intention?: string;
  status: 'scheduled' | 'done';
};

export type Objective = {
  id: string;
  userId: string;
  title: string;
  timeframe: 'this_week' | 'next_week';
  successCriteria?: string;
  status: 'planned' | 'active' | 'completed';
};

export type FocusSession = {
  id: string;
  userId: string;
  taskId: string;
  plannedMinutes: number;
  actualMinutes?: number;
  goal?: string;
  status: 'active' | 'completed';
  startedAt?: string;
  completedAt?: string;
  interruptions?: number;
};

export type ScheduledBreak = {
  id: string;
  userId: string;
  focusSessionId?: string;
  type: 'micro' | 'short' | 'long';
  start: string;
  end: string;
  reminderSent: boolean;
};

export type CalendarIntegrationStatus = {
  provider: 'google';
  status: 'connected' | 'disconnected';
  integrationId?: string;
  syncMode?: 'polling' | 'webhook';
  lastSyncedAt?: string | null;
  calendarId?: string | null;
};
