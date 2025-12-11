import { randomUUID } from 'crypto';
import { Router } from 'express';
import { z } from '../../lib/zod';
import { validateRequest } from '../../middleware/validate-request';

const focusSessionRouter = Router();

const createFocusSessionSchema = {
  body: z.object({
    userId: z.string().uuid(),
    taskId: z.string().uuid(),
    plannedMinutes: z.number().int().positive(),
    goal: z.string().optional(),
  }),
};

const completeFocusSessionSchema = {
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    actualMinutes: z.number().int().positive(),
    summary: z.string().optional(),
    interruptions: z.number().int().nonnegative().default(0),
  }),
};

focusSessionRouter.post(
  '/',
  validateRequest(createFocusSessionSchema),
  (req, res) => {
    const { userId, taskId, plannedMinutes, goal } = req.body;
    res.status(201).json({
      id: randomUUID(),
      userId,
      taskId,
      plannedMinutes,
      goal,
      status: 'active',
      startedAt: new Date().toISOString(),
    });
  }
);

focusSessionRouter.patch(
  '/:id/complete',
  validateRequest(completeFocusSessionSchema),
  (req, res) => {
    const { id } = req.params;
    const { actualMinutes, summary, interruptions } = req.body;
    res.json({
      id,
      status: 'completed',
      actualMinutes,
      interruptions,
      completedAt: new Date().toISOString(),
      summary,
    });
  }
);

focusSessionRouter.get('/', (_req, res) => {
  res.json({
    sessions: [
      {
        id: 'fs-1',
        userId: 'f1c3b317-1111-4b0c-9b44-2b2fd0d3f111',
        taskId: 't-1',
        plannedMinutes: 50,
        actualMinutes: 45,
        status: 'completed',
        startedAt: new Date(Date.now() - 1000 * 60 * 70).toISOString(),
        completedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      },
    ],
  });
});

export default focusSessionRouter;
