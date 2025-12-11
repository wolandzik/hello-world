import { TaskStatusEnum } from '../../lib/prisma-enums';
import { z } from '../../lib/zod';

const isoDate = z.string().datetime({ offset: true }).optional();
const priorityFactor = z.number().int().min(1).max(5).optional();

export const createTaskSchema = {
  body: z
    .object({
      userId: z.string().uuid(),
      title: z.string().min(1),
      status: z.nativeEnum(TaskStatusEnum).optional(),
      priorityLevel: z.number().int().min(1).max(5).optional(),
      priorityScore: z.number().nullable().optional(),
      importance: priorityFactor,
      urgency: priorityFactor,
      dueAt: isoDate,
      channelId: z.string().uuid().optional(),
      notes: z.string().optional(),
    })
    .refine(
      ({ importance, urgency }) =>
        (importance === undefined && urgency === undefined) ||
        (importance !== undefined && urgency !== undefined),
      {
        message: 'importance and urgency must be provided together',
        path: ['importance'],
      }
    ),
};

export const updateTaskSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z
    .object({
      title: z.string().min(1).optional(),
      status: z.nativeEnum(TaskStatusEnum).optional(),
      priorityLevel: z.number().int().min(1).max(5).optional(),
      priorityScore: z.number().nullable().optional(),
      importance: priorityFactor,
      urgency: priorityFactor,
      dueAt: isoDate,
      channelId: z.string().uuid().optional().nullable(),
      notes: z.string().optional(),
    })
    .refine(
      ({ importance, urgency }) =>
        (importance === undefined && urgency === undefined) ||
        (importance !== undefined && urgency !== undefined),
      {
        message: 'importance and urgency must be provided together',
        path: ['importance'],
      }
    )
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    }),
};

export const priorityUpdateSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z
    .object({
      priorityLevel: z.number().int().min(1).max(5).optional(),
      priorityScore: z.number().nullable().optional(),
      importance: priorityFactor,
      urgency: priorityFactor,
    })
    .refine(
      ({ importance, urgency }) =>
        (importance === undefined && urgency === undefined) ||
        (importance !== undefined && urgency !== undefined),
      {
        message: 'importance and urgency must be provided together',
        path: ['importance'],
      }
    )
    .refine((data) => Object.keys(data).length > 0, {
      message: 'priorityLevel or priorityScore is required',
    }),
};

export const taskIdSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
};

export const taskListSchema = {
  query: z.object({
    userId: z.string().uuid(),
    status: z.nativeEnum(TaskStatusEnum).optional(),
    channelId: z.string().uuid().optional(),
    scheduled: z.enum(['scheduled', 'unscheduled']).optional(),
    sortBy: z.enum(['priority', 'due', 'created']).optional(),
    sortDirection: z.enum(['asc', 'desc']).optional(),
  }),
};
