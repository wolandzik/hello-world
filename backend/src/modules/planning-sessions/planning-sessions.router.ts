import type { PlanningSession, PlanningSessionType } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { z } from '../../lib/zod';
import { validateRequest } from '../../middleware/validate-request';

const planningSessionRouter = Router();

const createPlanningSessionSchema = {
  body: z.object({
    userId: z.string().uuid(),
    type: z.enum(['morning', 'evening', 'weekly', 'custom']),
    context: z.enum(['work', 'personal']),
    source: z.enum(['auto', 'manual']).default('manual'),
    scheduledFor: z.string().datetime().optional(),
    plannedTaskIds: z.array(z.string().uuid()).optional(),
    notes: z.string().optional(),
  }),
};

const completePlanningSessionSchema = {
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    reflection: z.string().optional(),
    highlightTaskId: z.string().uuid().optional(),
    objectiveIds: z.array(z.string().uuid()).optional(),
  }),
};

const listPlanningSessionsSchema = {
  query: z.object({
    userId: z.string().uuid(),
    type: z
      .enum(['morning', 'evening', 'weekly', 'custom'])
      .optional() as z.ZodType<PlanningSessionType | undefined>,
  }),
};

const computeStatus = (session: PlanningSession) => {
  if (session.completed_at) return 'completed';
  if (session.started_at.getTime() > Date.now()) return 'planned';
  return 'in_progress';
};

const toResponse = async (session: PlanningSession) => {
  const plannedTasks = await prisma.task.findMany({
    where: { user_id: session.user_id, planned_sessions: { has: session.id } },
    select: { id: true },
  });

  return {
    id: session.id,
    userId: session.user_id,
    type: session.type,
    context: session.context,
    source: session.source,
    status: computeStatus(session),
    startedAt: session.started_at.toISOString(),
    completedAt: session.completed_at?.toISOString() ?? null,
    reflection: session.notes,
    plannedTaskIds: plannedTasks.map((task) => task.id).sort(),
  };
};

planningSessionRouter.post(
  '/',
  validateRequest(createPlanningSessionSchema),
  async (req, res, next) => {
    const { userId, type, context, source, scheduledFor, plannedTaskIds, notes } = req.body;

    try {
      const session = await prisma.$transaction(async (tx) => {
        const created = await tx.planningSession.create({
          data: {
            user_id: userId,
            type,
            context,
            source,
            started_at: scheduledFor ? new Date(scheduledFor) : new Date(),
            notes,
          },
        });

        if (plannedTaskIds?.length) {
          await Promise.all(
            plannedTaskIds.map((taskId) =>
              tx.task.update({
                where: { id: taskId },
                data: { planned_sessions: { push: created.id } },
              })
            )
          );
        }

        return created;
      });

      res.status(201).json(await toResponse(session));
    } catch (error) {
      next(error);
    }
  }
);

planningSessionRouter.patch(
  '/:id/complete',
  validateRequest(completePlanningSessionSchema),
  async (req, res, next) => {
    const { id } = req.params;
    const { reflection, highlightTaskId, objectiveIds } = req.body;

    try {
      const session = await prisma.$transaction(async (tx) => {
        if (objectiveIds?.length) {
          await tx.objective.updateMany({
            where: { id: { in: objectiveIds } },
            data: { status: 'active' },
          });
        }

        if (highlightTaskId) {
          await tx.task.update({
            where: { id: highlightTaskId },
            data: { priority_level: 5 },
          });
        }

        return tx.planningSession.update({
          where: { id },
          data: { completed_at: new Date(), notes: reflection },
        });
      });

      res.json(await toResponse(session));
    } catch (error) {
      next(error);
    }
  }
);

planningSessionRouter.get(
  '/',
  validateRequest(listPlanningSessionsSchema),
  async (req, res, next) => {
    const { userId, type } = req.query as { userId: string; type?: PlanningSessionType };

    try {
      const sessions = await prisma.planningSession.findMany({
        where: { user_id: userId, type },
        orderBy: { started_at: 'desc' },
      });

      const payload = await Promise.all(sessions.map((session) => toResponse(session)));
      res.json(payload);
    } catch (error) {
      next(error);
    }
  }
);

export default planningSessionRouter;
