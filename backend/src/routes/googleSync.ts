import { Router } from 'express';
import { googleOAuthConfig } from '../config/env';

const serializeScopes = (scopes: string[]) => scopes.join(' ');

export const createGoogleSyncRouter = (
  config = googleOAuthConfig,
) => {
  const router = Router();

  const buildAuthorizationUrl = () => {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: serializeScopes(config.scopes),
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
    });

    return `${config.authorizationEndpoint}?${params.toString()}`;
  };

  router.get('/connect', (_req, res) => {
    if (!config.clientId || !config.clientSecret) {
      return res.status(500).json({
        provider: 'google',
        error: 'Google OAuth is not configured. Please set client id/secret.',
      });
    }

    return res.json({
      provider: 'google',
      authorizationUrl: buildAuthorizationUrl(),
      redirectUri: config.redirectUri,
      scopes: config.scopes,
    });
  });

  router.post('/disconnect', (_req, res) => {
    res.json({
      provider: 'google',
      status: 'disconnect_placeholder',
      redirectUri: config.disconnectRedirectUri,
    });
  });

  return router;
};

const googleSyncRouter = createGoogleSyncRouter();

export default googleSyncRouter;
