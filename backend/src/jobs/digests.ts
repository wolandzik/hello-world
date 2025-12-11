import { prisma } from '../lib/prisma';
import { log } from '../lib/logger';
import { trackTelemetry } from '../lib/telemetry';

const DAILY_DIGEST_INTERVAL_MS = 1000 * 60 * 60 * 6; // every 6 hours to avoid drift
let interval: NodeJS.Timeout | null = null;

const startOfUtcDay = (date: Date) => {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
};

export const buildDailyDigest = async (now = new Date()) => {
  const start = startOfUtcDay(now);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const [tasksDueToday, integrations] = await Promise.all([
    prisma.task.findMany({
      where: {
        due_at: { gte: start, lt: end },
        status: { in: ['todo', 'in_progress'] },
      },
    }),
    prisma.calendarIntegration.findMany(),
  ]);

  const staleIntegrations = integrations.filter((integration) => {
    const syncState = (integration.sync_state ?? {}) as Record<string, unknown>;
    const lastSyncValue = syncState.lastSyncAt as string | undefined;
    if (!lastSyncValue) return true;
    const lastSync = new Date(lastSyncValue);
    const hoursSinceSync = (now.getTime() - lastSync.getTime()) / 3_600_000;
    return hoursSinceSync > 24;
  });

  const digest = {
    date: start.toISOString(),
    dueToday: tasksDueToday.length,
    staleIntegrations: staleIntegrations.length,
    affectedUserIds: Array.from(new Set(staleIntegrations.map((i) => i.user_id))),
  };

  trackTelemetry('digest.generated', digest);
  log({ level: 'info', message: 'daily_digest_ready', ...digest });

  return digest;
};

export const startDigestJob = () => {
  if (process.env.NODE_ENV === 'test' || interval) {
    return interval;
  }

  interval = setInterval(async () => {
    try {
      await buildDailyDigest();
    } catch (error) {
      log({ level: 'error', message: 'daily_digest_failed', error });
    }
  }, DAILY_DIGEST_INTERVAL_MS);

  return interval;
};

export const stopDigestJob = () => {
  if (!interval) return;
  clearInterval(interval);
  interval = null;
};
