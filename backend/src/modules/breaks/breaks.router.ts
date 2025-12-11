import { randomUUID } from 'crypto';
import { Router } from 'express';
import { z } from '../../lib/zod';
import { validateRequest } from '../../middleware/validate-request';

const breaksRouter = Router();

const createBreakSchema = {
  body: z.object({
    userId: z.string().uuid(),
    focusSessionId: z.string().uuid().optional(),
    start: z.string().datetime(),
    durationMinutes: z.number().int().positive(),
    type: z.enum(['micro', 'short', 'long']).default('short'),
  }),
};

breaksRouter.post('/', validateRequest(createBreakSchema), (req, res) => {
  const { userId, focusSessionId, start, durationMinutes, type } = req.body;
  const startDate = new Date(start);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  res.status(201).json({
    id: randomUUID(),
    userId,
    focusSessionId,
    type,
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    reminderSent: false,
  });
});

breaksRouter.get('/', (_req, res) => {
  res.json({
    breaks: [
      {
        id: 'break-1',
        userId: 'f1c3b317-1111-4b0c-9b44-2b2fd0d3f111',
        type: 'short',
        start: new Date(Date.now() + 1000 * 60 * 45).toISOString(),
        end: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        reminderSent: true,
      },
    ],
  });
});

export default breaksRouter;
