import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../index';

describe('health endpoint', () => {
  it('responds with status ok', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
