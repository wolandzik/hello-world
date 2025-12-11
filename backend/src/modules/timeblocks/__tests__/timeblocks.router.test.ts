import express from 'express';
import request from 'supertest';
import type { Provider, TimeBlockStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../../middleware/error-handler';
import { ProviderEnum, TimeBlockStatusEnum } from '../../../lib/prisma-enums';
import timeblocksRouter from '../timeblocks.router';

vi.mock('../../../lib/prisma', () => {
  const create = vi.fn();
  const findMany = vi.fn();

  return {
    prisma: {
      timeBlock: { create, findMany },
    },
  };
});

const { prisma } = await import('../../../lib/prisma');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/timeblocks', timeblocksRouter);
  app.use(errorHandler);
  return app;
};

describe('timeblocks router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a timeblock with defaults and returns the saved record', async () => {
    const app = createApp();

    const mockTimeblock = {
      id: 'block-1',
      user_id: '3b6e2506-13cb-4f7e-8741-15e7dad3fe7d',
      task_id: null,
      start_at: new Date('2024-04-01T10:00:00.000Z'),
      end_at: new Date('2024-04-01T11:00:00.000Z'),
      status: TimeBlockStatusEnum.tentative as TimeBlockStatus,
      provider: ProviderEnum.local as Provider,
      location: null,
      notes: null,
      calendar_event_id: null,
      recurrence_rule: null,
      created_at: new Date('2024-04-01T09:00:00.000Z'),
      updated_at: new Date('2024-04-01T09:00:00.000Z'),
    };

    prisma.timeBlock.create.mockResolvedValue(mockTimeblock);

    const response = await request(app).post('/timeblocks').send({
      userId: mockTimeblock.user_id,
      startAt: mockTimeblock.start_at.toISOString(),
      endAt: mockTimeblock.end_at.toISOString(),
    });

    expect(response.status).toBe(201);
    expect(prisma.timeBlock.create).toHaveBeenCalledWith({
      data: {
        user_id: mockTimeblock.user_id,
        start_at: mockTimeblock.start_at,
        end_at: mockTimeblock.end_at,
        task_id: null,
        status: TimeBlockStatusEnum.tentative,
        provider: ProviderEnum.local,
      },
    });
    expect(response.body).toMatchObject({
      id: mockTimeblock.id,
      userId: mockTimeblock.user_id,
      status: TimeBlockStatusEnum.tentative,
      provider: ProviderEnum.local,
    });
    expect(response.body.startAt).toBe(mockTimeblock.start_at.toISOString());
    expect(response.body.endAt).toBe(mockTimeblock.end_at.toISOString());
  });

  it('rejects timeblocks where endAt is before startAt', async () => {
    const app = createApp();

    const response = await request(app).post('/timeblocks').send({
      userId: 'e70212ae-7f99-4716-9a3e-4c22d10e3b5d',
      startAt: '2024-04-01T12:00:00.000Z',
      endAt: '2024-04-01T11:00:00.000Z',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Validation failed');
  });

  it('lists timeblocks filtered by status and task id', async () => {
    const app = createApp();

    const mockTimeblocks = [
      {
        id: 'block-2',
        user_id: '16b3e56d-5891-414a-a8ef-c32b4c8f4ea6',
        task_id: 'f8bedb0c-0584-4e22-8ee4-8237b70572aa',
        start_at: new Date('2024-05-01T10:00:00.000Z'),
        end_at: new Date('2024-05-01T11:00:00.000Z'),
        status: TimeBlockStatusEnum.confirmed as TimeBlockStatus,
        provider: ProviderEnum.google as Provider,
        location: null,
        notes: null,
        calendar_event_id: null,
        recurrence_rule: null,
        created_at: new Date('2024-05-01T09:00:00.000Z'),
        updated_at: new Date('2024-05-01T09:00:00.000Z'),
      },
    ];

    prisma.timeBlock.findMany.mockResolvedValue(mockTimeblocks);

    const response = await request(app)
      .get('/timeblocks')
      .query({
        userId: mockTimeblocks[0].user_id,
        status: TimeBlockStatusEnum.confirmed,
        taskId: mockTimeblocks[0].task_id,
      });

    expect(prisma.timeBlock.findMany).toHaveBeenCalledWith({
      where: {
        user_id: mockTimeblocks[0].user_id,
        status: TimeBlockStatusEnum.confirmed,
        task_id: mockTimeblocks[0].task_id,
      },
      orderBy: { start_at: 'asc' },
    });
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      id: mockTimeblocks[0].id,
      status: TimeBlockStatusEnum.confirmed,
      provider: ProviderEnum.google,
    });
  });
});

