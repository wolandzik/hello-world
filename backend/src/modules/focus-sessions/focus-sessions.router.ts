import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../../middleware/validate-request';

const focusSessionRouter = Router();

const createFocusSessionSchema = {
  body: z.object({
    userId: z.string().uuid(),
    taskId: z.string().uuid(),
    plannedMinutes: z.number().int().positive(),
  }),
};

focusSessionRouter.post('/', validateRequest(createFocusSessionSchema), (req, res) => {
  const { userId, taskId, plannedMinutes } = req.body;
  res.status(201).json({
    userId,
    taskId,
    plannedMinutes,
    status: 'active',
  });
});

focusSessionRouter.get('/', (_req, res) => {
  res.json({ message: 'Focus sessions not implemented yet' });
});

export default focusSessionRouter;
