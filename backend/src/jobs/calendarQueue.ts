import { Queue, Worker, QueueEvents, JobsOptions } from 'bullmq';
import { redisConfig } from '../config/env';
import { CalendarProvider } from '../integrations/calendar/types';

export const CALENDAR_SYNC_QUEUE = 'calendar_sync';

export interface CalendarSyncJobData {
  integrationId: string;
  provider: CalendarProvider;
  userId: string;
  mode: 'polling' | 'webhook';
  cursor?: string;
}

export const calendarSyncQueue = new Queue<CalendarSyncJobData>(CALENDAR_SYNC_QUEUE, {
  connection: {
    url: redisConfig.url,
  },
});

export const calendarSyncQueueEvents = new QueueEvents(CALENDAR_SYNC_QUEUE, {
  connection: { url: redisConfig.url },
});

export const enqueueCalendarSyncJob = async (
  data: CalendarSyncJobData,
  options: JobsOptions = {},
) => calendarSyncQueue.add('sync', data, options);

export const registerCalendarSyncWorker = () =>
  new Worker<CalendarSyncJobData>(
    CALENDAR_SYNC_QUEUE,
    async (job) => {
      // Placeholder sync job handler; wire up API calls and persistence later.
      // eslint-disable-next-line no-console
      console.log(`Processing calendar sync job ${job.id}`, job.data);
      return { status: 'ok', processedAt: new Date().toISOString() };
    },
    {
      connection: { url: redisConfig.url },
    },
  );
