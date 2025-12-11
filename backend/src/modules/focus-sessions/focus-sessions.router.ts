import type { FocusSessionStatus } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { z } from '../../lib/zod';
import { validateRequest } from '../../middleware/validate-request';

const focusSessionRouter = Router();

const createFocusSessionSchema = {
  body: z
    .object({
      userId: z.string().uuid(),
      taskId: z.string().uuid(),
      plannedMinutes: z.number().int().positive(),
      startAt: z.string().datetime().optional(),
      endAt: z.string().datetime().optional(),
      goal: z.string().optional(),
      channelId: z.string().uuid().optional(),
    })
    .refine(
      ({ startAt, endAt }) => {
        if (!startAt || !endAt) return true;
        return new Date(endAt) > new Date(startAt);
      },
      { path: ['endAt'], message: 'endAt must be after startAt' }
    ),
};

const completeFocusSessionSchema = {
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    actualMinutes: z.number().int().positive(),
    summary: z.string().optional(),
    interruptions: z.number().int().nonnegative().default(0),
  }),
};

const listFocusSessionsSchema = {
  query: z.object({
    userId: z.string().uuid(),
    status: z
      .enum(['active', 'completed', 'cancelled'])
      .optional() as z.ZodType<FocusSessionStatus | undefined>,
  }),
};

const toResponse = (session: {
  id: string;
  user_id: string;
  task_id: string;
  start_at: Date;
  end_at: Date;
  planned_minutes: number;
  actual_minutes: number | null;
  status: FocusSessionStatus;
  interruptions: unknown;
  created_at: Date;
}) => ({
  id: session.id,
  userId: session.user_id,
  taskId: session.task_id,
  startAt: session.start_at.toISOString(),
  endAt: session.end_at.toISOString(),
  plannedMinutes: session.planned_minutes,
  actualMinutes: session.actual_minutes,
  status: session.status,
  interruptions: session.interruptions,
  goal: typeof session.interruptions === 'object' && session.interruptions !== null
    ? (session.interruptions as Record<string, unknown>).goal
    : undefined,
  createdAt: session.created_at?.toISOString(),
});

focusSessionRouter.post(
  '/',
  validateRequest(createFocusSessionSchema),
  async (req, res, next) => {
    const { userId, taskId, plannedMinutes, startAt, endAt, goal, channelId } = req.body;

    try {
      const parsedStart = startAt ? new Date(startAt) : new Date();
      const parsedEnd = endAt
        ? new Date(endAt)
        : new Date(parsedStart.getTime() + plannedMinutes * 60 * 1000);

      const session = await prisma.focusSession.create({
        data: {
          user_id: userId,
          task_id: taskId,
          planned_minutes: plannedMinutes,
          start_at: parsedStart,
          end_at: parsedEnd,
          interruptions: goal ? { goal } : undefined,
        },
      });

      if (channelId) {
        await prisma.timeBlock.create({
          data: {
            user_id: userId,
            task_id: taskId,
            channel_id: channelId,
            start_at: parsedStart,
            end_at: parsedEnd,
            status: 'tentative',
            provider: 'local',
            notes: 'Focus session block',
          },
        });
      }

      res.status(201).json(toResponse(session));
    } catch (error) {
      next(error);
    }
  }
);

focusSessionRouter.patch(
  '/:id/complete',
  validateRequest(completeFocusSessionSchema),
  async (req, res, next) => {
    const { id } = req.params;
    const { actualMinutes, summary, interruptions } = req.body;

    try {
      const existing = await prisma.focusSession.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ message: 'Session not found' });
      }
      if (existing.status === 'completed') {
        return res.status(400).json({ message: 'Session already completed' });
      }

      const updatedInterruptions = {
        ...(typeof existing.interruptions === 'object' && existing.interruptions !== null
          ? (existing.interruptions as Record<string, unknown>)
          : {}),
        summary,
        interruptions,
      };

      const session = await prisma.focusSession.update({
        where: { id },
        data: {
          status: 'completed',
          actual_minutes: actualMinutes,
          end_at: new Date(),
          interruptions: updatedInterruptions,
        },
      });

      const currentActual = existing.actual_minutes ?? 0;
      await prisma.task.update({
        where: { id: session.task_id },
        data: { actual_minutes: currentActual + actualMinutes },
      });

      res.json(toResponse(session));
    } catch (error) {
      next(error);
    }
  }
);

focusSessionRouter.get(
  '/',
  validateRequest(listFocusSessionsSchema),
  async (req, res, next) => {
    const { userId, status } = req.query as {
      userId: string;
      status?: FocusSessionStatus;
    };

    try {
      const sessions = await prisma.focusSession.findMany({
        where: { user_id: userId, status },
        orderBy: { start_at: 'desc' },
      });

      res.json(sessions.map(toResponse));
    } catch (error) {
      next(error);
    }
  }
);

export default focusSessionRouter;
