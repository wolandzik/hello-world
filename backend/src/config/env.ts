export const googleOAuthConfig = {
  clientId: process.env.GOOGLE_OAUTH_CLIENT_ID ?? '',
  clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? '',
  redirectUri:
    process.env.GOOGLE_OAUTH_REDIRECT_URI ?? 'http://localhost:3000/api/auth/google/callback',
  disconnectRedirectUri:
    process.env.GOOGLE_OAUTH_DISCONNECT_REDIRECT_URI ?? 'http://localhost:3000/settings/integrations',
  scopes: [
    'openid',
    'email',
    'https://www.googleapis.com/auth/calendar',
  ],
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

export const redisConfig = {
  url: process.env.REDIS_URL ?? 'redis://localhost:6379',
};
