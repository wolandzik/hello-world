import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../../middleware/validate-request';

const planningSessionRouter = Router();

const createPlanningSessionSchema = {
  body: z.object({
    userId: z.string().uuid(),
    type: z.enum(['morning', 'evening', 'weekly', 'custom']),
    context: z.enum(['work', 'personal']),
  }),
};

planningSessionRouter.post(
  '/',
  validateRequest(createPlanningSessionSchema),
  (req, res) => {
    const { userId, type, context } = req.body;
    res.status(201).json({ userId, type, context, status: 'pending' });
  }
);

planningSessionRouter.get('/', (_req, res) => {
  res.json({ message: 'Planning sessions not implemented yet' });
});

export default planningSessionRouter;
