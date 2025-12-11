import request from 'supertest';
import app from '../index';

describe('Google sync endpoints', () => {
  it('exposes OAuth connect metadata', async () => {
    const response = await request(app).get('/sync/providers/google/connect');
    expect(response.status).toBe(200);
    expect(response.body.provider).toBe('google');
    expect(response.body.authorizationUrl).toContain('https://accounts.google.com');
    expect(response.body.scopes).toContain('https://www.googleapis.com/auth/calendar');
  });

  it('returns placeholder disconnect response', async () => {
    const response = await request(app).post('/sync/providers/google/disconnect');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('disconnect_placeholder');
  });
});
