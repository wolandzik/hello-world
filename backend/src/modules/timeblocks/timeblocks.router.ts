import { Router } from 'express';
import { validateRequest } from '../../middleware/validate-request';
import { z } from 'zod';

const timeblocksRouter = Router();

const createTimeblockSchema = {
  body: z.object({
    userId: z.string().uuid(),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    taskId: z.string().uuid().optional(),
  }),
};

timeblocksRouter.post(
  '/',
  validateRequest(createTimeblockSchema),
  (req, res) => {
    const { userId, startAt, endAt, taskId } = req.body;
    res.status(201).json({
      userId,
      startAt,
      endAt,
      taskId: taskId ?? null,
      status: 'tentative',
    });
  }
);

timeblocksRouter.get('/', (_req, res) => {
  res.json({ message: 'Timeblock listing not implemented yet' });
});

export default timeblocksRouter;
