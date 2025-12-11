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
    process.env.TEST_DATABASE_URL || 'postgresql://app:password@localhost:5432/app_db';
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

describe('planning rituals and focus mode', () => {
  it('captures a planning session with planned tasks and reflections', async () => {
    if (skipSuite) return;

    const user = await prisma.user.create({
      data: { email: 'planner@example.com', display_name: 'Planner' },
    });

    const [taskA, taskB] = await prisma.$transaction([
      prisma.task.create({
        data: { user_id: user.id, title: 'Prioritize bugs', priority_level: 3 },
      }),
      prisma.task.create({
        data: { user_id: user.id, title: 'Prep weekly doc', priority_level: 2 },
      }),
    ]);

    const objective = await prisma.objective.create({
      data: {
        user_id: user.id,
        title: 'Ship planning doc',
        type: 'weekly',
        status: 'planned',
      },
    });

    const startResponse = await request(app).post('/planning-sessions').send({
      userId: user.id,
      type: 'morning',
      context: 'work',
      plannedTaskIds: [taskA.id, taskB.id],
    });

    expect(startResponse.status).toBe(201);
    expect(startResponse.body.status).toBe('in_progress');
    expect(startResponse.body.plannedTaskIds).toEqual(
      expect.arrayContaining([taskA.id, taskB.id])
    );

    const updatedTask = await prisma.task.findUnique({ where: { id: taskA.id } });
    expect(updatedTask?.planned_sessions).toContain(startResponse.body.id);

    const completeResponse = await request(app)
      .patch(`/planning-sessions/${startResponse.body.id}/complete`)
      .send({
        reflection: 'Today went well',
        highlightTaskId: taskA.id,
        objectiveIds: [objective.id],
      });

    expect(completeResponse.status).toBe(200);
    expect(completeResponse.body.status).toBe('completed');
    expect(completeResponse.body.reflection).toBe('Today went well');

    const refreshedObjective = await prisma.objective.findUnique({ where: { id: objective.id } });
    expect(refreshedObjective?.status).toBe('active');

    const highlightedTask = await prisma.task.findUnique({ where: { id: taskA.id } });
    expect(highlightedTask?.priority_level).toBe(5);
  });

  it('runs a focus session, books a block, and logs actual time', async () => {
    if (skipSuite) return;

    const user = await prisma.user.create({
      data: { email: 'focus@example.com', display_name: 'Focus User' },
    });

    const [task, channel] = await prisma.$transaction([
      prisma.task.create({
        data: { user_id: user.id, title: 'Deep work task', priority_level: 4 },
      }),
      prisma.channel.create({ data: { user_id: user.id, name: 'Deep Work' } }),
    ]);

    const createResponse = await request(app).post('/focus-sessions').send({
      userId: user.id,
      taskId: task.id,
      plannedMinutes: 25,
      channelId: channel.id,
      goal: 'Ship draft',
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.status).toBe('active');
    expect(createResponse.body.goal).toBe('Ship draft');

    const blocks = await prisma.timeBlock.findMany({ where: { task_id: task.id } });
    expect(blocks).toHaveLength(1);

    const completeResponse = await request(app)
      .patch(`/focus-sessions/${createResponse.body.id}/complete`)
      .send({ actualMinutes: 20, summary: 'Done', interruptions: 1 });

    expect(completeResponse.status).toBe(200);
    expect(completeResponse.body.actualMinutes).toBe(20);
    expect(completeResponse.body.status).toBe('completed');

    const taskWithActuals = await prisma.task.findUnique({ where: { id: task.id } });
    expect(taskWithActuals?.actual_minutes).toBe(20);
  });
});

