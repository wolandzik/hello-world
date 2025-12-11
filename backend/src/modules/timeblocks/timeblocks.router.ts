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
  channelId: timeblock.channel_id ?? null,
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
      channelId: z.string().uuid().optional(),
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

const suggestTimeblockSchema = {
  body: z
    .object({
      userId: z.string().uuid(),
      taskId: z.string().uuid().optional(),
      channelId: z.string().uuid().optional().nullable(),
      durationMinutes: z.number().int().min(15).max(8 * 60).default(60),
      windowStart: z.string().datetime().optional(),
      windowEnd: z.string().datetime().optional(),
      preferredStartHour: z.number().int().min(0).max(23).default(9),
      preferredEndHour: z.number().int().min(1).max(23).default(17),
    })
    .refine(
      ({ windowStart, windowEnd }) => {
        if (!windowStart || !windowEnd) return true;
        return new Date(windowEnd) > new Date(windowStart);
      },
      { message: 'windowEnd must be after windowStart', path: ['windowEnd'] }
    )
    .refine(
      ({ preferredStartHour, preferredEndHour }) => preferredEndHour > preferredStartHour,
      { message: 'preferredEndHour must be greater than preferredStartHour', path: ['preferredEndHour'] }
    ),
};

const listTimeblocksSchema = {
  query: z.object({
    userId: z.string().uuid(),
    status: z.nativeEnum(TimeBlockStatusEnum).optional(),
    taskId: z.string().uuid().optional(),
    channelId: z.string().uuid().optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
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
      channelId: z.string().uuid().optional().nullable(),
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
const addDays = (value: Date, days: number) => new Date(value.getTime() + days * 86400000);

const handleNotFound = (id: string) => new HttpError(404, `Timeblock ${id} not found`);

const handlePrismaError = (error: unknown, id: string) => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  ) {
    return handleNotFound(id);
  }
  return error;
};

const ensureNoConflicts = async (
  userId: string,
  startAt: Date,
  endAt: Date,
  excludeId?: string
) => {
  const conflict = await prisma.timeBlock.findFirst({
    where: {
      user_id: userId,
      status: { not: TimeBlockStatusEnum.cancelled as TimeBlockStatus },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      AND: [{ start_at: { lt: endAt } }, { end_at: { gt: startAt } }],
    },
    select: { id: true, start_at: true, end_at: true },
  });

  if (conflict) {
    throw new HttpError(409, 'Timeblock overlaps with an existing block', {
      conflict,
    });
  }
};

const findFirstOpenSlot = (
  busyBlocks: Array<Pick<TimeBlock, 'start_at' | 'end_at'>>, // assumed sorted asc
  searchStart: Date,
  searchEnd: Date,
  preferredStartHour: number,
  preferredEndHour: number,
  durationMinutes: number
): { start: Date; end: Date } | null => {
  const durationMs = durationMinutes * 60 * 1000;

  const iterateDate = new Date(searchStart);
  iterateDate.setHours(0, 0, 0, 0);

  while (iterateDate <= searchEnd) {
    const dayStart = new Date(iterateDate);
    dayStart.setHours(preferredStartHour, 0, 0, 0);

    const dayEnd = new Date(iterateDate);
    dayEnd.setHours(preferredEndHour, 0, 0, 0);

    const windowStart = new Date(Math.max(dayStart.getTime(), searchStart.getTime()));
    const windowEnd = new Date(Math.min(dayEnd.getTime(), searchEnd.getTime()));

    if (windowEnd > windowStart) {
      const dayBusy = busyBlocks.filter(
        (block) => block.start_at < windowEnd && block.end_at > windowStart
      );

      let cursor = windowStart;

      for (const block of dayBusy) {
        if (block.start_at.getTime() - cursor.getTime() >= durationMs) {
          return { start: cursor, end: new Date(cursor.getTime() + durationMs) };
        }

        if (block.end_at > cursor) {
          cursor = block.end_at;
        }
      }

      if (windowEnd.getTime() - cursor.getTime() >= durationMs) {
        return { start: cursor, end: new Date(cursor.getTime() + durationMs) };
      }
    }

    iterateDate.setDate(iterateDate.getDate() + 1);
  }

  return null;
};

timeblocksRouter.post(
  '/',
  validateRequest(createTimeblockSchema),
  async (req, res, next) => {
    const { userId, startAt, endAt, taskId, channelId, status, provider } =
      req.body;

    try {
      const start = parseDate(startAt);
      const end = parseDate(endAt);

      await ensureNoConflicts(userId, start, end);

      const timeblock = await prisma.timeBlock.create({
        data: {
          user_id: userId,
          start_at: start,
          end_at: end,
          task_id: taskId ?? null,
          channel_id: channelId ?? null,
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
    const { userId, status, taskId, channelId, from, to } = req.query as {
      userId: string;
      status?: TimeBlockStatus;
      taskId?: string;
      channelId?: string;
      from?: string;
      to?: string;
    };

    try {
      const timeblocks = await prisma.timeBlock.findMany({
        where: {
          user_id: userId,
          status,
          task_id: taskId,
          channel_id: channelId,
          start_at: from ? { gte: parseDate(from) } : undefined,
          end_at: to ? { lte: parseDate(to) } : undefined,
        },
        orderBy: { start_at: 'asc' },
      });

      res.json(timeblocks.map(toTimeblockResponse));
    } catch (error) {
      next(error);
    }
  }
);

timeblocksRouter.post(
  '/suggest',
  validateRequest(suggestTimeblockSchema),
  async (req, res, next) => {
    const {
      userId,
      taskId,
      channelId,
      durationMinutes,
      windowStart,
      windowEnd,
      preferredStartHour,
      preferredEndHour,
    } = req.body;

    try {
      const searchStart = windowStart ? parseDate(windowStart) : new Date();
      const searchEnd = windowEnd ? parseDate(windowEnd) : addDays(searchStart, 7);

      const busyBlocks = await prisma.timeBlock.findMany({
        where: {
          user_id: userId,
          status: { not: TimeBlockStatusEnum.cancelled as TimeBlockStatus },
          OR: [
            { start_at: { lte: searchEnd }, end_at: { gte: searchStart } },
            { end_at: { gte: searchStart } },
          ],
        },
        orderBy: { start_at: 'asc' },
        select: { start_at: true, end_at: true },
      });

      const nextSlot = findFirstOpenSlot(
        busyBlocks,
        searchStart,
        searchEnd,
        preferredStartHour,
        preferredEndHour,
        durationMinutes
      );

      if (!nextSlot) {
        throw new HttpError(409, 'No available time within the selected window');
      }

      await ensureNoConflicts(userId, nextSlot.start, nextSlot.end);

      const timeblock = await prisma.timeBlock.create({
        data: {
          user_id: userId,
          task_id: taskId ?? null,
          channel_id: channelId ?? null,
          start_at: nextSlot.start,
          end_at: nextSlot.end,
          status: TimeBlockStatusEnum.tentative as TimeBlockStatus,
          provider: ProviderEnum.local as Provider,
        },
      });

      res.status(201).json({ suggestion: toTimeblockResponse(timeblock) });
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
      channelId,
      status,
      provider,
      location,
      notes,
      calendarEventId,
      recurrenceRule,
    } = req.body;

    try {
      const existing = await prisma.timeBlock.findUnique({ where: { id } });

      if (!existing) {
        throw handleNotFound(id);
      }

      const nextStart = startAt ? parseDate(startAt) : existing.start_at;
      const nextEnd = endAt ? parseDate(endAt) : existing.end_at;

      await ensureNoConflicts(existing.user_id, nextStart, nextEnd, id);

      const updated = await prisma.timeBlock.update({
        where: { id },
        data: {
          start_at: startAt ? nextStart : undefined,
          end_at: endAt ? nextEnd : undefined,
          task_id: taskId === undefined ? undefined : taskId,
          channel_id: channelId === undefined ? undefined : channelId,
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
