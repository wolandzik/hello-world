import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { HttpError } from '../../lib/http-error';
import { prisma } from '../../lib/prisma';
import { validateRequest } from '../../middleware/validate-request';
import { toTaskResponse } from './task.mapper';
import {
  createTaskSchema,
  priorityUpdateSchema,
  taskIdSchema,
  taskListSchema,
  updateTaskSchema,
} from './task.schemas';

const tasksRouter = Router();

const handleNotFound = (id: string) => new HttpError(404, `Task ${id} not found`);

const parseDate = (value?: string | null) => (value ? new Date(value) : null);

const handlePrismaError = (error: unknown, id: string) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    throw handleNotFound(id);
  }
  throw error;
};

tasksRouter.post('/', validateRequest(createTaskSchema), async (req, res, next) => {
  const { userId, title, status, priorityLevel, priorityScore, dueAt, notes } = req.body;

  try {
    const task = await prisma.task.create({
      data: {
        user_id: userId,
        title,
        status,
        priority_level: priorityLevel ?? 3,
        priority_score: priorityScore ?? null,
        due_at: parseDate(dueAt),
        rich_notes: notes,
      },
    });

    res.status(201).json(toTaskResponse(task));
  } catch (error) {
    next(error);
  }
});

tasksRouter.get('/', validateRequest(taskListSchema), async (req, res, next) => {
  const { userId, status } = req.query as { userId: string; status?: string };

  try {
    const tasks = await prisma.task.findMany({
      where: {
        user_id: userId,
        status,
      },
      orderBy: { created_at: 'desc' },
    });

    res.json(tasks.map(toTaskResponse));
  } catch (error) {
    next(error);
  }
});

tasksRouter.get('/:id', validateRequest(taskIdSchema), async (req, res, next) => {
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
});

tasksRouter.patch('/:id', validateRequest(updateTaskSchema), async (req, res, next) => {
  const { id } = req.params;
  const { title, status, priorityLevel, priorityScore, dueAt, notes } = req.body;

  try {
    const task = await prisma.task.update({
      where: { id },
      data: {
        title,
        status,
        priority_level: priorityLevel,
        priority_score: priorityScore,
        due_at: parseDate(dueAt),
        rich_notes: notes,
      },
    });

    res.json(toTaskResponse(task));
  } catch (error) {
    next(handlePrismaError(error, id));
  }
});

tasksRouter.delete('/:id', validateRequest(taskIdSchema), async (req, res, next) => {
  const { id } = req.params;

  try {
    await prisma.task.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(handlePrismaError(error, id));
  }
});

tasksRouter.post(
  '/:id/priority',
  validateRequest(priorityUpdateSchema),
  async (req, res, next) => {
    const { id } = req.params;
    const { priorityLevel, priorityScore } = req.body;

    try {
      const task = await prisma.task.update({
        where: { id },
        data: {
          priority_level: priorityLevel,
          priority_score: priorityScore ?? null,
        },
      });

      res.json(toTaskResponse(task));
    } catch (error) {
      next(handlePrismaError(error, id));
    }
  },
);

export default tasksRouter;
