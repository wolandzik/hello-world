import { randomUUID } from 'crypto';
import { Router } from 'express';
import { z } from '../../lib/zod';
import { validateRequest } from '../../middleware/validate-request';

const objectivesRouter = Router();

const createObjectiveSchema = {
  body: z.object({
    userId: z.string().uuid(),
    title: z.string().min(3),
    timeframe: z.enum(['this_week', 'next_week']),
    successCriteria: z.string().optional(),
  }),
};

objectivesRouter.post(
  '/',
  validateRequest(createObjectiveSchema),
  (req, res) => {
    const { userId, title, timeframe, successCriteria } = req.body;
    res.status(201).json({
      id: randomUUID(),
      userId,
      title,
      timeframe,
      successCriteria,
      status: 'active',
    });
  }
);

objectivesRouter.get('/', (_req, res) => {
  res.json({
    objectives: [
      {
        id: 'obj-1',
        userId: 'f1c3b317-1111-4b0c-9b44-2b2fd0d3f111',
        title: 'Ship onboarding beta',
        timeframe: 'this_week',
        successCriteria: '3 pilot users complete onboarding',
        status: 'active',
      },
      {
        id: 'obj-2',
        userId: 'f1c3b317-1111-4b0c-9b44-2b2fd0d3f111',
        title: 'Draft Q1 roadmap',
        timeframe: 'next_week',
        status: 'planned',
      },
    ],
  });
});

export default objectivesRouter;
