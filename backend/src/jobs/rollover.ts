import { prisma } from '../lib/prisma';

const startOfToday = (now: Date) => {
  const copy = new Date(now);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
};

export const rolloverIncompleteTasks = async (now = new Date()) => {
  const today = startOfToday(now);

  const candidates = await prisma.task.findMany({
    where: {
      status: { in: ['todo', 'in_progress'] },
      due_at: { lt: today },
    },
  });

  await Promise.all(
    candidates.map((task) =>
      prisma.task.update({
        where: { id: task.id },
        data: {
          status: 'todo',
          due_at: today,
          rollover_state: {
            rolledFrom: task.due_at,
            rolledAt: now.toISOString(),
            previousSessions: task.planned_sessions,
          },
        },
      })
    )
  );

  return candidates.length;
};

export const startRolloverJob = () => {
  if (process.env.NODE_ENV === 'test') return;

  const scheduleNextRun = () => {
    const now = new Date();
    const next = new Date(now);
    next.setUTCHours(24, 0, 5, 0);
    const delay = Math.max(next.getTime() - now.getTime(), 1000 * 60 * 60);

    setTimeout(async () => {
      try {
        const count = await rolloverIncompleteTasks();
        if (count > 0) {
          console.info(`[rollover] carried ${count} tasks forward`);
        }
      } catch (error) {
        console.error('[rollover] failed to process tasks', error);
      } finally {
        scheduleNextRun();
      }
    }, delay);
  };

  scheduleNextRun();
};

