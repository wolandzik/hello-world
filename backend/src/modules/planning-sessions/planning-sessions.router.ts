import { randomUUID } from 'crypto';
import { Router } from 'express';
import { z } from '../../lib/zod';
import { validateRequest } from '../../middleware/validate-request';

const planningSessionRouter = Router();

const createPlanningSessionSchema = {
  body: z.object({
    userId: z.string().uuid(),
    type: z.enum(['morning', 'evening', 'weekly', 'custom']),
    context: z.enum(['work', 'personal']),
    scheduledFor: z.string().datetime().optional(),
  }),
};

const completePlanningSessionSchema = {
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    reflection: z.string().optional(),
    highlightId: z.string().uuid().optional(),
    objectiveIds: z.array(z.string().uuid()).default([]),
  }),
};

planningSessionRouter.post(
  '/',
  validateRequest(createPlanningSessionSchema),
  (req, res) => {
    const { userId, type, context, scheduledFor } = req.body;
    res.status(201).json({
      id: randomUUID(),
      userId,
      type,
      context,
      status: 'in_progress',
      scheduledFor: scheduledFor ?? new Date().toISOString(),
      startedAt: new Date().toISOString(),
    });
  }
);

planningSessionRouter.patch(
  '/:id/complete',
  validateRequest(completePlanningSessionSchema),
  (req, res) => {
    const { id } = req.params;
    const { reflection, highlightId, objectiveIds } = req.body;
    res.json({
      id,
      status: 'completed',
      completedAt: new Date().toISOString(),
      reflection,
      highlightId,
      objectiveIds,
    });
  }
);

planningSessionRouter.get('/', (_req, res) => {
  res.json({
    sessions: [
      {
        id: 'ps-1',
        userId: 'f1c3b317-1111-4b0c-9b44-2b2fd0d3f111',
        type: 'morning',
        context: 'work',
        status: 'completed',
        startedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        completedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        highlightId: 'h-1',
        objectiveIds: ['obj-1'],
      },
    ],
  });
});

export default planningSessionRouter;
