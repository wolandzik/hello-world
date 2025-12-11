import type { PlanningSessionType } from '@prisma/client';
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
    notes: z.string().optional(),
  }),
};

const completePlanningSessionSchema = {
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    reflection: z.string().optional(),
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

const toResponse = (session: {
  id: string;
  user_id: string;
  type: PlanningSessionType;
  context: string;
  source: string;
  started_at: Date;
  completed_at: Date | null;
  notes: string | null;
}) => ({
  id: session.id,
  userId: session.user_id,
  type: session.type,
  context: session.context,
  source: session.source,
  startedAt: session.started_at.toISOString(),
  completedAt: session.completed_at?.toISOString() ?? null,
  notes: session.notes,
});

planningSessionRouter.post(
  '/',
  validateRequest(createPlanningSessionSchema),
  async (req, res, next) => {
    const { userId, type, context, source, scheduledFor, notes } = req.body;

    try {
      const session = await prisma.planningSession.create({
        data: {
          user_id: userId,
          type,
          context,
          source,
          started_at: scheduledFor ? new Date(scheduledFor) : new Date(),
          notes,
        },
      });

      res.status(201).json(toResponse(session));
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
    const { reflection } = req.body;

    try {
      const session = await prisma.planningSession.update({
        where: { id },
        data: { completed_at: new Date(), notes: reflection },
      });

      res.json(toResponse(session));
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

      res.json(sessions.map(toResponse));
    } catch (error) {
      next(error);
    }
  }
);

export default planningSessionRouter;
