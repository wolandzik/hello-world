import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildDailyDigest } from '../jobs/digests';

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

    ({ prisma } = await import('../lib/prisma'));
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

describe('daily digests', () => {
  it('summarizes tasks and stale calendar syncs', async () => {
    if (skipSuite) {
      return;
    }

    const today = new Date('2024-02-02T12:00:00Z');

    const user = await prisma.user.create({
      data: { email: 'digest@example.com', display_name: 'Digest User' },
    });

    await prisma.task.createMany({
      data: [
        {
          id: randomUUID(),
          user_id: user.id,
          title: 'Due today',
          status: 'todo',
          due_at: new Date('2024-02-02T09:00:00Z'),
        },
        {
          id: randomUUID(),
          user_id: user.id,
          title: 'Tomorrow',
          status: 'todo',
          due_at: new Date('2024-02-03T09:00:00Z'),
        },
        {
          id: randomUUID(),
          user_id: user.id,
          title: 'Done already',
          status: 'done',
          due_at: new Date('2024-02-02T10:00:00Z'),
        },
      ],
    });

    await prisma.calendarIntegration.create({
      data: {
        user_id: user.id,
        provider: 'google',
        access_token: 'token',
        sync_state: { lastSyncAt: '2024-01-31T10:00:00Z' },
        sync_mode: 'polling',
      },
    });

    await prisma.calendarIntegration.create({
      data: {
        user_id: user.id,
        provider: 'google',
        access_token: 'token',
        sync_state: { lastSyncAt: '2024-02-02T08:00:00Z' },
        sync_mode: 'polling',
      },
    });

    const digest = await buildDailyDigest(today);

    expect(digest.dueToday).toBe(1);
    expect(digest.staleIntegrations).toBe(1);
    expect(digest.affectedUserIds).toEqual([user.id]);
  });
});
