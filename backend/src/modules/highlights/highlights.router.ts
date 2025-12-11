import { randomUUID } from 'crypto';
import { Router } from 'express';
import { z } from '../../lib/zod';
import { validateRequest } from '../../middleware/validate-request';

const highlightsRouter = Router();

const createHighlightSchema = {
  body: z.object({
    userId: z.string().uuid(),
    title: z.string().min(3),
    date: z.string().date(),
    intention: z.string().optional(),
  }),
};

highlightsRouter.post(
  '/',
  validateRequest(createHighlightSchema),
  (req, res) => {
    const { userId, title, date, intention } = req.body;
    res.status(201).json({
      id: randomUUID(),
      userId,
      title,
      date,
      intention,
      status: 'scheduled',
    });
  }
);

highlightsRouter.get('/', (_req, res) => {
  res.json({
    highlights: [
      {
        id: 'h-1',
        userId: 'f1c3b317-1111-4b0c-9b44-2b2fd0d3f111',
        title: 'Lead onboarding sync',
        date: new Date().toISOString().slice(0, 10),
        status: 'scheduled',
      },
    ],
  });
});

export default highlightsRouter;
