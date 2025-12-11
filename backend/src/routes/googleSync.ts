import { Router } from 'express';
import { googleOAuthConfig } from '../config/env';

const googleSyncRouter = Router();

const serializeScopes = (scopes: string[]) => scopes.join(' ');

const buildAuthorizationUrl = () => {
  const params = new URLSearchParams({
    client_id: googleOAuthConfig.clientId,
    redirect_uri: googleOAuthConfig.redirectUri,
    response_type: 'code',
    scope: serializeScopes(googleOAuthConfig.scopes),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
  });

  return `${googleOAuthConfig.authorizationEndpoint}?${params.toString()}`;
};

googleSyncRouter.get('/connect', (_req, res) => {
  res.json({
    provider: 'google',
    authorizationUrl: buildAuthorizationUrl(),
    redirectUri: googleOAuthConfig.redirectUri,
    scopes: googleOAuthConfig.scopes,
  });
});

googleSyncRouter.post('/disconnect', (_req, res) => {
  res.json({
    provider: 'google',
    status: 'disconnect_placeholder',
    redirectUri: googleOAuthConfig.disconnectRedirectUri,
  });
});

export default googleSyncRouter;
