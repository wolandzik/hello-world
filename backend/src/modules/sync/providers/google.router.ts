import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../../../middleware/validate-request';

const syncProviderRouter = Router();

const oauthStartSchema = {
  body: z.object({
    userId: z.string().uuid(),
    scopes: z.array(z.string()).nonempty(),
  }),
};

syncProviderRouter.post('/connect', validateRequest(oauthStartSchema), (req, res) => {
  const { userId, scopes } = req.body;
  res.status(202).json({ provider: 'google', userId, scopes, status: 'pending' });
});

syncProviderRouter.post('/disconnect', (_req, res) => {
  res.json({ provider: 'google', status: 'disconnected' });
});

syncProviderRouter.post('/webhook', (_req, res) => {
  res.json({ provider: 'google', message: 'Webhook received' });
});

export default syncProviderRouter;
