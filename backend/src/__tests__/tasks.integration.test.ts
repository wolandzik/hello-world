import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { Express } from 'express';
import request from 'supertest';
import type { PrismaClient } from '@prisma/client';

let app: Express;
let prisma: PrismaClient;
let schema: string;

beforeAll(async () => {
  const baseDatabaseUrl =
    process.env.TEST_DATABASE_URL || 'postgresql://app:password@localhost:5432/app_db';
  schema = `test_${randomUUID().replace(/-/g, '')}`;
  const databaseUrl = `${baseDatabaseUrl}?schema=${schema}`;
  process.env.DATABASE_URL = databaseUrl;

  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });

  const appModule = await import('../app');
  ({ prisma } = await import('../lib/prisma'));
  app = appModule.default;
});

afterAll(async () => {
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await prisma.$disconnect();
});

describe('tasks integration', () => {
  it('creates, lists, updates, and deletes a task', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'integration@example.com',
        display_name: 'Integration User',
      },
    });

    const createResponse = await request(app).post('/tasks').send({
      userId: user.id,
      title: 'Write integration tests',
      priorityLevel: 4,
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.title).toBe('Write integration tests');

    const listResponse = await request(app).get('/tasks').query({ userId: user.id });
    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toHaveLength(1);

    const taskId = createResponse.body.id;
    const updateResponse = await request(app)
      .patch(`/tasks/${taskId}`)
      .send({ status: 'in_progress', priorityScore: 0.9 });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.status).toBe('in_progress');
    expect(updateResponse.body.priorityScore).toBe(0.9);

    const priorityResponse = await request(app)
      .post(`/tasks/${taskId}/priority`)
      .send({ priorityLevel: 2 });
    expect(priorityResponse.status).toBe(200);
    expect(priorityResponse.body.priorityLevel).toBe(2);

    const deleteResponse = await request(app).delete(`/tasks/${taskId}`);
    expect(deleteResponse.status).toBe(204);
  });
});
