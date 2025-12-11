import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { HttpError } from '../../lib/http-error';
import { prisma } from '../../lib/prisma';
import { recordAuditLog } from '../../lib/audit';
import { trackTelemetry } from '../../lib/telemetry';
import { validateRequest } from '../../middleware/validate-request';
import { defaultPriorityLevel, computePriorityScore } from './priority';
import { toTaskResponse } from './task.mapper';
import {
  createTaskSchema,
  priorityUpdateSchema,
  taskIdSchema,
  taskListSchema,
  updateTaskSchema,
} from './task.schemas';

const tasksRouter = Router();

const handleNotFound = (id: string) =>
  new HttpError(404, `Task ${id} not found`);

const parseDate = (value?: string | null) => (value ? new Date(value) : null);

const buildPriorityScore = (
  priorityScore?: number | null,
  importance?: number,
  urgency?: number
) => priorityScore ?? computePriorityScore(importance, urgency);

const handlePrismaError = (error: unknown, id: string) => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  ) {
    throw handleNotFound(id);
  }
  throw error;
};

tasksRouter.post(
  '/',
  validateRequest(createTaskSchema),
  async (req, res, next) => {
    const {
      userId,
      title,
      status,
      priorityLevel,
      priorityScore,
      importance,
      urgency,
      dueAt,
      channelId,
      notes,
    } = req.body;

    try {
      const computedPriority = buildPriorityScore(priorityScore, importance, urgency);

      const task = await prisma.task.create({
        data: {
          user_id: userId,
          title,
          status,
          priority_level: priorityLevel ?? defaultPriorityLevel,
          priority_score: computedPriority,
          due_at: parseDate(dueAt),
          channel_id: channelId,
          rich_notes: notes,
        },
      });

      await recordAuditLog({
        userId,
        action: 'task.created',
        entityType: 'task',
        entityId: task.id,
        metadata: {
          priorityLevel: task.priority_level,
          priorityScore: task.priority_score,
        },
      });
      trackTelemetry('task.created', {
        userId,
        taskId: task.id,
        priority: task.priority_score,
      });

      res.status(201).json(toTaskResponse(task));
    } catch (error) {
      next(error);
    }
  }
);

tasksRouter.get(
  '/',
  validateRequest(taskListSchema),
  async (req, res, next) => {
    const { userId, status, channelId, scheduled, sortBy, sortDirection } =
      req.query as {
        userId: string;
        status?: string;
        channelId?: string;
        scheduled?: 'scheduled' | 'unscheduled';
        sortBy?: 'priority' | 'due' | 'created';
        sortDirection?: 'asc' | 'desc';
      };

    try {
      const orderBy: Prisma.TaskOrderByWithRelationInput[] = (() => {
        const priorityDirection = sortBy === 'priority' ? sortDirection ?? 'desc' : 'desc';
        const priorityOrder: Prisma.TaskOrderByWithRelationInput = {
          priority_score: { sort: priorityDirection, nulls: 'last' },
        };

        if (sortBy === 'due') {
          return [
            { due_at: sortDirection ?? 'asc' },
            priorityOrder,
          ];
        }
        if (sortBy === 'created') {
          return [{ created_at: sortDirection ?? 'desc' }];
        }

        return [
          priorityOrder,
          { due_at: 'asc' },
          { created_at: 'desc' },
        ];
      })();

      const scheduledFilter =
        scheduled === 'scheduled'
          ? { some: {} }
          : scheduled === 'unscheduled'
            ? { none: {} }
            : undefined;

      const tasks = await prisma.task.findMany({
        where: {
          user_id: userId,
          status,
          channel_id: channelId,
          time_blocks: scheduledFilter,
        },
        orderBy,
      });

      res.json(tasks.map(toTaskResponse));
    } catch (error) {
      next(error);
    }
  }
);

tasksRouter.get(
  '/:id',
  validateRequest(taskIdSchema),
  async (req, res, next) => {
    const { id } = req.params;

    try {
      const task = await prisma.task.findUnique({ where: { id } });
      if (!task) {
        throw handleNotFound(id);
      }

      res.json(toTaskResponse(task));
    } catch (error) {
      next(error);
    }
  }
);

tasksRouter.patch(
  '/:id',
  validateRequest(updateTaskSchema),
  async (req, res, next) => {
    const { id } = req.params;
    const {
      title,
      status,
      priorityLevel,
      priorityScore,
      importance,
      urgency,
      dueAt,
      channelId,
      notes,
    } = req.body;

    try {
      const computedPriority = buildPriorityScore(priorityScore, importance, urgency);

      const data: Prisma.TaskUpdateInput = {
        title,
        status,
        priority_level: priorityLevel,
        due_at: parseDate(dueAt),
        channel_id: channelId,
        rich_notes: notes,
      };

      if (computedPriority !== null) {
        data.priority_score = computedPriority;
      } else if (priorityScore === null) {
        data.priority_score = null;
      }

      const task = await prisma.task.update({
        where: { id },
        data,
      });

      await recordAuditLog({
        userId: task.user_id,
        action: 'task.updated',
        entityType: 'task',
        entityId: task.id,
        metadata: {
          status: task.status,
          priorityLevel: task.priority_level,
          priorityScore: task.priority_score,
        },
      });
      trackTelemetry('task.updated', {
        userId: task.user_id,
        taskId: task.id,
        status: task.status,
      });

      res.json(toTaskResponse(task));
    } catch (error) {
      next(handlePrismaError(error, id));
    }
  }
);

tasksRouter.delete(
  '/:id',
  validateRequest(taskIdSchema),
  async (req, res, next) => {
    const { id } = req.params;

    try {
      const task = await prisma.task.delete({ where: { id } });
      await recordAuditLog({
        userId: task.user_id,
        action: 'task.deleted',
        entityType: 'task',
        entityId: task.id,
      });
      trackTelemetry('task.deleted', { userId: task.user_id, taskId: id });
      res.status(204).send();
    } catch (error) {
      next(handlePrismaError(error, id));
    }
  }
);

tasksRouter.post(
  '/:id/priority',
  validateRequest(priorityUpdateSchema),
  async (req, res, next) => {
    const { id } = req.params;
    const { priorityLevel, priorityScore, importance, urgency } = req.body;

    try {
      const computedPriority = buildPriorityScore(priorityScore, importance, urgency);

      const data: Prisma.TaskUpdateInput = {
        priority_level: priorityLevel,
      };

      if (computedPriority !== null) {
        data.priority_score = computedPriority;
      } else if (priorityScore === null) {
        data.priority_score = null;
      }

      const task = await prisma.task.update({
        where: { id },
        data,
      });

      await recordAuditLog({
        userId: task.user_id,
        action: 'task.priority',
        entityType: 'task',
        entityId: task.id,
        metadata: {
          priorityLevel: task.priority_level,
          priorityScore: task.priority_score,
        },
      });
      trackTelemetry('task.priority', {
        userId: task.user_id,
        taskId: task.id,
        priorityLevel: task.priority_level,
      });

      res.json(toTaskResponse(task));
    } catch (error) {
      next(handlePrismaError(error, id));
    }
  }
);

export default tasksRouter;
