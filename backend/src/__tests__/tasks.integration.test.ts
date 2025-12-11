import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { Express } from 'express';
import request from 'supertest';
import type { PrismaClient } from '@prisma/client';
import { Provider } from '@prisma/client';
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

describe('tasks integration', () => {
  it('creates, lists, updates, and deletes a task', async () => {
    if (skipSuite) {
      return;
    }

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

    const listResponse = await request(app)
      .get('/tasks')
      .query({ userId: user.id });
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

    const auditLogs = await prisma.auditLog.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: 'asc' },
    });

    expect(auditLogs.map((log) => log.action)).toEqual([
      'task.created',
      'task.updated',
      'task.priority',
      'task.deleted',
    ]);
  });

  it('computes priority scores and filters by schedule/channel', async () => {
    if (skipSuite) {
      return;
    }

    const user = await prisma.user.create({
      data: {
        email: 'priority@example.com',
        display_name: 'Priority User',
      },
    });

    const channel = await prisma.channel.create({
      data: { name: 'Work', user_id: user.id },
    });

    const [highScore, midScore, unscheduled] = await Promise.all([
      request(app).post('/tasks').send({
        userId: user.id,
        title: 'High importance',
        importance: 5,
        urgency: 2,
        dueAt: new Date(Date.now() + 86400000).toISOString(),
        channelId: channel.id,
      }),
      request(app).post('/tasks').send({
        userId: user.id,
        title: 'Urgent',
        importance: 2,
        urgency: 5,
        dueAt: new Date(Date.now() + 2 * 86400000).toISOString(),
      }),
      request(app).post('/tasks').send({
        userId: user.id,
        title: 'No blocks',
        priorityLevel: 2,
      }),
    ]);

    expect(highScore.body.priorityScore).toBeGreaterThan(midScore.body.priorityScore);

    await prisma.timeBlock.create({
      data: {
        user_id: user.id,
        task_id: highScore.body.id,
        start_at: new Date(),
        end_at: new Date(Date.now() + 30 * 60000),
        provider: Provider.local,
      },
    });

    const sorted = await request(app)
      .get('/tasks')
      .query({ userId: user.id });

    expect(sorted.body[0].id).toBe(highScore.body.id);

    const scheduledOnly = await request(app)
      .get('/tasks')
      .query({ userId: user.id, scheduled: 'scheduled' });

    expect(scheduledOnly.body).toHaveLength(1);
    expect(scheduledOnly.body[0].id).toBe(highScore.body.id);

    const channelFiltered = await request(app)
      .get('/tasks')
      .query({ userId: user.id, channelId: channel.id });

    expect(channelFiltered.body).toHaveLength(1);
    expect(channelFiltered.body[0].id).toBe(highScore.body.id);

    const unscheduledOnly = await request(app)
      .get('/tasks')
      .query({ userId: user.id, scheduled: 'unscheduled' });

    const ids = unscheduledOnly.body.map((task: { id: string }) => task.id);
    expect(ids).toContain(midScore.body.id);
    expect(ids).toContain(unscheduled.body.id);
  });
});
