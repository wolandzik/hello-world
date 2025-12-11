import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../index';
import { googleOAuthConfig } from '../config/env';
import { createGoogleSyncRouter } from '../routes/googleSync';

describe('Google sync endpoints', () => {
  it('exposes OAuth connect metadata', async () => {
    const response = await request(app).get('/sync/providers/google/connect');
    expect(response.status).toBe(200);
    expect(response.body.provider).toBe('google');
    expect(response.body.authorizationUrl).toContain(
      'https://accounts.google.com'
    );
    expect(response.body.scopes).toContain(
      'https://www.googleapis.com/auth/calendar'
    );
  });

  it('returns placeholder disconnect response', async () => {
    const response = await request(app).post(
      '/sync/providers/google/disconnect'
    );
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('disconnect_placeholder');
  });

  it('surfaces a configuration error when client credentials are missing', async () => {
    const testApp = express();

    testApp.use(
      '/sync/providers/google',
      createGoogleSyncRouter({
        ...googleOAuthConfig,
        clientId: '',
        clientSecret: '',
      })
    );

    const response = await request(testApp).get(
      '/sync/providers/google/connect'
    );

    expect(response.status).toBe(500);
    expect(response.body.error).toMatch(/not configured/i);
  });
});
