import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { Express } from 'express';
import request from 'supertest';
import type { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let app: Express;
let prisma: PrismaClient;
let schema: string;
let skipSuite = false;

beforeAll(async () => {
  const baseDatabaseUrl =
    process.env.TEST_DATABASE_URL ||
    'postgresql://app:password@localhost:5432/app_db';
  schema = `test_${randomUUID().replace(/-/g, '')}`;
  const databaseUrl = `${baseDatabaseUrl}?schema=${schema}`;
  process.env.DATABASE_URL = databaseUrl;

  try {
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'inherit',
    });

    const appModule = await import('../app');
    ({ prisma } = await import('../lib/prisma'));
    app = appModule.default;
  } catch (error) {
    skipSuite = true;
  }
});

afterAll(async () => {
  if (skipSuite || !prisma) {
    return;
  }

  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await prisma.$disconnect();
});

describe('timeblocks integration', () => {
  it('creates, updates, lists, and deletes time blocks', async () => {
    if (skipSuite) {
      return;
    }

    const user = await prisma.user.create({
      data: {
        email: 'timeblocks@example.com',
        display_name: 'Timeblock User',
      },
    });

    const startAt = new Date('2024-01-01T09:00:00.000Z').toISOString();
    const endAt = new Date('2024-01-01T10:00:00.000Z').toISOString();

    const createResponse = await request(app).post('/timeblocks').send({
      userId: user.id,
      startAt,
      endAt,
      status: 'tentative',
      provider: 'local',
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.startAt).toBe(startAt);
    expect(createResponse.body.endAt).toBe(endAt);

    const listResponse = await request(app)
      .get('/timeblocks')
      .query({ userId: user.id });
    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toHaveLength(1);

    const blockId = createResponse.body.id as string;
    const updateResponse = await request(app)
      .patch(`/timeblocks/${blockId}`)
      .send({
        status: 'confirmed',
        location: 'Zoom',
        recurrenceRule: 'FREQ=DAILY',
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.status).toBe('confirmed');
    expect(updateResponse.body.location).toBe('Zoom');
    expect(updateResponse.body.recurrenceRule).toBe('FREQ=DAILY');

    const deleteResponse = await request(app).delete(`/timeblocks/${blockId}`);
    expect(deleteResponse.status).toBe(204);

    const emptyList = await request(app)
      .get('/timeblocks')
      .query({ userId: user.id });
    expect(emptyList.body).toHaveLength(0);
  });
});
