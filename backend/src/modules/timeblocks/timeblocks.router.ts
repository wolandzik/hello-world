import type { Provider, TimeBlock, TimeBlockStatus } from '@prisma/client';
import { Router } from 'express';
import { ProviderEnum, TimeBlockStatusEnum } from '../../lib/prisma-enums';
import { prisma } from '../../lib/prisma';
import { validateRequest } from '../../middleware/validate-request';
import { z } from '../../lib/zod';

const toTimeblockResponse = (timeblock: TimeBlock) => ({
  id: timeblock.id,
  userId: timeblock.user_id,
  taskId: timeblock.task_id,
  startAt: timeblock.start_at.toISOString(),
  endAt: timeblock.end_at.toISOString(),
  status: timeblock.status,
  provider: timeblock.provider,
  location: timeblock.location ?? null,
  notes: timeblock.notes ?? null,
  calendarEventId: timeblock.calendar_event_id ?? null,
  recurrenceRule: timeblock.recurrence_rule ?? null,
  createdAt: timeblock.created_at?.toISOString(),
  updatedAt: timeblock.updated_at?.toISOString(),
});

const timeblocksRouter = Router();

const createTimeblockSchema = {
  body: z
    .object({
      userId: z.string().uuid(),
      startAt: z.string().datetime(),
      endAt: z.string().datetime(),
      taskId: z.string().uuid().optional(),
      status: z
        .nativeEnum(TimeBlockStatusEnum)
        .default(TimeBlockStatusEnum.tentative as TimeBlockStatus),
      provider: z
        .enum([ProviderEnum.google, ProviderEnum.local])
        .default(ProviderEnum.local as Provider),
    })
    .refine(
      ({ startAt, endAt }) => new Date(endAt) > new Date(startAt),
      { message: 'endAt must be after startAt', path: ['endAt'] }
    ),
};

const listTimeblocksSchema = {
  query: z.object({
    userId: z.string().uuid(),
    status: z.nativeEnum(TimeBlockStatusEnum).optional(),
    taskId: z.string().uuid().optional(),
  }),
};

const parseDate = (value: string) => new Date(value);

timeblocksRouter.post(
  '/',
  validateRequest(createTimeblockSchema),
  async (req, res, next) => {
    const { userId, startAt, endAt, taskId, status, provider } = req.body;

    try {
      const timeblock = await prisma.timeBlock.create({
        data: {
          user_id: userId,
          start_at: parseDate(startAt),
          end_at: parseDate(endAt),
          task_id: taskId ?? null,
          status,
          provider,
        },
      });

      res.status(201).json(toTimeblockResponse(timeblock));
    } catch (error) {
      next(error);
    }
  }
);

timeblocksRouter.get(
  '/',
  validateRequest(listTimeblocksSchema),
  async (req, res, next) => {
    const { userId, status, taskId } = req.query as {
      userId: string;
      status?: TimeBlockStatus;
      taskId?: string;
    };

    try {
      const timeblocks = await prisma.timeBlock.findMany({
        where: {
          user_id: userId,
          status,
          task_id: taskId,
        },
        orderBy: { start_at: 'asc' },
      });

      res.json(timeblocks.map(toTimeblockResponse));
    } catch (error) {
      next(error);
    }
  }
);

export default timeblocksRouter;
