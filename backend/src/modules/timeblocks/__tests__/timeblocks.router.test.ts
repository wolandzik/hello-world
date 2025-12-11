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
  const findFirst = vi.fn();
  const findUnique = vi.fn();
  const update = vi.fn();

  return {
    prisma: {
      timeBlock: { create, findMany, findFirst, findUnique, update },
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

    prisma.timeBlock.findFirst.mockResolvedValue(null);

    const mockTimeblock = {
      id: 'block-1',
      user_id: '3b6e2506-13cb-4f7e-8741-15e7dad3fe7d',
      task_id: null,
      channel_id: null,
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
        channel_id: null,
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

  it('surfaces conflicts when a block overlaps', async () => {
    const app = createApp();

    prisma.timeBlock.findFirst.mockResolvedValue({
      id: 'existing',
      start_at: new Date('2024-04-01T10:30:00.000Z'),
      end_at: new Date('2024-04-01T11:30:00.000Z'),
    });

    const response = await request(app).post('/timeblocks').send({
      userId: '2a2c65ce-cb64-45ce-8d1d-157e147057d0',
      startAt: '2024-04-01T10:00:00.000Z',
      endAt: '2024-04-01T11:00:00.000Z',
    });

    expect(response.status).toBe(409);
    expect(response.body.error.message).toContain('overlaps');
  });

  it('lists timeblocks filtered by status and task id', async () => {
    const app = createApp();

    const mockTimeblocks = [
      {
        id: 'block-2',
        user_id: '16b3e56d-5891-414a-a8ef-c32b4c8f4ea6',
        task_id: 'f8bedb0c-0584-4e22-8ee4-8237b70572aa',
        channel_id: '11111111-2222-3333-8888-555555555555',
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
        channelId: mockTimeblocks[0].channel_id,
        from: '2024-05-01T00:00:00.000Z',
        to: '2024-05-02T00:00:00.000Z',
      });

    expect(prisma.timeBlock.findMany).toHaveBeenCalledWith({
      where: {
        user_id: mockTimeblocks[0].user_id,
        status: TimeBlockStatusEnum.confirmed,
        task_id: mockTimeblocks[0].task_id,
        channel_id: mockTimeblocks[0].channel_id,
        start_at: { gte: new Date('2024-05-01T00:00:00.000Z') },
        end_at: { lte: new Date('2024-05-02T00:00:00.000Z') },
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

  it('updates timeblocks while checking conflicts and channel assignment', async () => {
    const app = createApp();

    const existing = {
      id: '33333333-4444-5555-8888-777777777777',
      user_id: 'c86b7e83-5aae-4f5a-8a54-ef07f967174c',
      task_id: null,
      channel_id: null,
      start_at: new Date('2024-05-01T12:00:00.000Z'),
      end_at: new Date('2024-05-01T13:00:00.000Z'),
    };

    prisma.timeBlock.findUnique.mockResolvedValue(existing);
    prisma.timeBlock.findFirst.mockResolvedValue(null);
    prisma.timeBlock.update.mockResolvedValue({
      ...existing,
      channel_id: 'aaaaaaaa-bbbb-4ccc-8888-eeeeeeeeeeee',
      start_at: new Date('2024-05-01T12:30:00.000Z'),
      updated_at: new Date('2024-05-01T11:00:00.000Z'),
      status: TimeBlockStatusEnum.confirmed as TimeBlockStatus,
      provider: ProviderEnum.local as Provider,
      location: null,
      notes: null,
      calendar_event_id: null,
      recurrence_rule: null,
    });

    const response = await request(app)
      .patch(`/timeblocks/${existing.id}`)
      .send({
        startAt: '2024-05-01T12:30:00.000Z',
        channelId: 'aaaaaaaa-bbbb-4ccc-8888-eeeeeeeeeeee',
        status: TimeBlockStatusEnum.confirmed,
      });

    expect(prisma.timeBlock.findUnique).toHaveBeenCalledWith({
      where: { id: existing.id },
    });
    expect(prisma.timeBlock.findFirst).toHaveBeenCalled();
    expect(prisma.timeBlock.update).toHaveBeenCalledWith({
      where: { id: existing.id },
      data: {
        start_at: new Date('2024-05-01T12:30:00.000Z'),
        end_at: undefined,
        task_id: undefined,
        channel_id: 'aaaaaaaa-bbbb-4ccc-8888-eeeeeeeeeeee',
        status: TimeBlockStatusEnum.confirmed,
        provider: undefined,
        location: undefined,
        notes: undefined,
        calendar_event_id: undefined,
        recurrence_rule: undefined,
      },
    });
    expect(response.status).toBe(200);
    expect(response.body.channelId).toBe('aaaaaaaa-bbbb-4ccc-8888-eeeeeeeeeeee');
  });

  it('suggests the next available block within working hours', async () => {
    const app = createApp();

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-05-01T08:30:00.000Z'));

    prisma.timeBlock.findMany.mockResolvedValue([
      {
        start_at: new Date('2024-05-01T10:00:00.000Z'),
        end_at: new Date('2024-05-01T11:00:00.000Z'),
      },
    ]);
    prisma.timeBlock.findFirst.mockResolvedValue(null);
    prisma.timeBlock.create.mockResolvedValue({
      id: 'slot-1',
      user_id: '6f2f3f2f-4567-4c4b-a0b2-1b679e19c101',
      task_id: '11111111-2222-4ccc-8ddd-555555555555',
      channel_id: null,
      start_at: new Date('2024-05-01T09:00:00.000Z'),
      end_at: new Date('2024-05-01T10:00:00.000Z'),
      status: TimeBlockStatusEnum.tentative as TimeBlockStatus,
      provider: ProviderEnum.local as Provider,
      location: null,
      notes: null,
      calendar_event_id: null,
      recurrence_rule: null,
      created_at: new Date('2024-05-01T08:00:00.000Z'),
      updated_at: new Date('2024-05-01T08:00:00.000Z'),
    });

    const response = await request(app).post('/timeblocks/suggest').send({
      userId: '6f2f3f2f-4567-4c4b-a0b2-1b679e19c101',
      taskId: '11111111-2222-4ccc-8ddd-555555555555',
      durationMinutes: 60,
      preferredStartHour: 9,
      preferredEndHour: 17,
      windowStart: '2024-05-01T08:30:00.000Z',
    });

    expect(prisma.timeBlock.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        start_at: new Date('2024-05-01T09:00:00.000Z'),
        end_at: new Date('2024-05-01T10:00:00.000Z'),
        status: TimeBlockStatusEnum.tentative,
      }),
    });
    expect(response.status).toBe(201);
    expect(response.body.suggestion.startAt).toBe('2024-05-01T09:00:00.000Z');
    vi.useRealTimers();
  });

  it('returns conflict when no suggestion fits the window', async () => {
    const app = createApp();

    prisma.timeBlock.findMany.mockResolvedValue([
      {
        start_at: new Date('2024-05-01T09:00:00.000Z'),
        end_at: new Date('2024-05-01T17:00:00.000Z'),
      },
    ]);

    const response = await request(app).post('/timeblocks/suggest').send({
      userId: '6f2f3f2f-4567-4c4b-a0b2-1b679e19c101',
      durationMinutes: 120,
      windowStart: '2024-05-01T08:30:00.000Z',
      windowEnd: '2024-05-01T18:30:00.000Z',
      preferredStartHour: 9,
      preferredEndHour: 17,
    });

    expect(response.status).toBe(409);
    expect(response.body.error.message).toContain('No available time');
  });
});

