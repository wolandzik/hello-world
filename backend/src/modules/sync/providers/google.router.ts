import { Router } from 'express';
import { prisma } from '../../../lib/prisma';
import { z } from '../../../lib/zod';
import { validateRequest } from '../../../middleware/validate-request';

const syncProviderRouter = Router();

const oauthStartSchema = {
  body: z.object({
    userId: z.string().uuid(),
    scopes: z.array(z.string()).nonempty(),
    accessToken: z.string(),
    refreshToken: z.string().optional(),
    expiresAt: z.string().datetime().optional(),
  }),
};

syncProviderRouter.post(
  '/connect',
  validateRequest(oauthStartSchema),
  async (req, res, next) => {
    const { userId, scopes, accessToken, refreshToken, expiresAt } = req.body;

    try {
      const integration = await prisma.calendarIntegration.upsert({
        where: {
          user_id_provider: { user_id: userId, provider: 'google' },
        },
        update: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt ? new Date(expiresAt) : null,
          sync_state: { scopes },
        },
        create: {
          user_id: userId,
          provider: 'google',
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt ? new Date(expiresAt) : null,
          sync_state: { scopes },
        },
      });

      res
        .status(202)
        .json({
          provider: 'google',
          userId,
          scopes,
          status: 'connected',
          integrationId: integration.id,
        });
    } catch (error) {
      next(error);
    }
  }
);

syncProviderRouter.post(
  '/disconnect',
  validateRequest({ body: z.object({ userId: z.string().uuid() }) }),
  async (req, res, next) => {
    const { userId } = req.body;

    try {
      await prisma.calendarIntegration.deleteMany({
        where: { user_id: userId, provider: 'google' },
      });

      res.json({ provider: 'google', status: 'disconnected' });
    } catch (error) {
      next(error);
    }
  }
);

syncProviderRouter.post('/webhook', (_req, res) => {
  res.json({ provider: 'google', message: 'Webhook received' });
});

export default syncProviderRouter;
