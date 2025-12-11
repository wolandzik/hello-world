import { Prisma, type Provider, type TimeBlock, type TimeBlockStatus } from '@prisma/client';
import { Router } from 'express';
import { ProviderEnum, TimeBlockStatusEnum } from '../../lib/prisma-enums';
import { HttpError } from '../../lib/http-error';
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

const timeblockIdSchema = {
  params: z.object({ id: z.string().uuid() }),
};

const updateTimeblockSchema = {
  ...timeblockIdSchema,
  body: z
    .object({
      startAt: z.string().datetime().optional(),
      endAt: z.string().datetime().optional(),
      taskId: z.string().uuid().optional().nullable(),
      status: z.nativeEnum(TimeBlockStatusEnum).optional(),
      provider: z.enum([ProviderEnum.google, ProviderEnum.local]).optional(),
      location: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
      calendarEventId: z.string().optional().nullable(),
      recurrenceRule: z.string().optional().nullable(),
    })
    .refine(
      ({ startAt, endAt }) => {
        if (!startAt || !endAt) return true;
        return new Date(endAt) > new Date(startAt);
      },
      { message: 'endAt must be after startAt', path: ['endAt'] }
    ),
};

const parseDate = (value: string) => new Date(value);

const handleNotFound = (id: string) => new HttpError(404, `Timeblock ${id} not found`);

const handlePrismaError = (error: unknown, id: string) => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  ) {
    throw handleNotFound(id);
  }
  throw error;
};

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

timeblocksRouter.patch(
  '/:id',
  validateRequest(updateTimeblockSchema),
  async (req, res, next) => {
    const { id } = req.params;
    const {
      startAt,
      endAt,
      taskId,
      status,
      provider,
      location,
      notes,
      calendarEventId,
      recurrenceRule,
    } = req.body;

    try {
      const updated = await prisma.timeBlock.update({
        where: { id },
        data: {
          start_at: startAt ? parseDate(startAt) : undefined,
          end_at: endAt ? parseDate(endAt) : undefined,
          task_id: taskId === undefined ? undefined : taskId,
          status,
          provider,
          location: location ?? undefined,
          notes: notes ?? undefined,
          calendar_event_id: calendarEventId ?? undefined,
          recurrence_rule: recurrenceRule ?? undefined,
        },
      });

      res.json(toTimeblockResponse(updated));
    } catch (error) {
      next(handlePrismaError(error, id));
    }
  }
);

timeblocksRouter.delete(
  '/:id',
  validateRequest(timeblockIdSchema),
  async (req, res, next) => {
    const { id } = req.params;

    try {
      await prisma.timeBlock.delete({ where: { id } });
      res.status(204).send();
    } catch (error) {
      next(handlePrismaError(error, id));
    }
  }
);

export default timeblocksRouter;
