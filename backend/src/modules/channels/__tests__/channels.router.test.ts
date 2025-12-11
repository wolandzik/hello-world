import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../../middleware/error-handler';
import channelsRouter from '../channels.router';

vi.mock('../../../lib/prisma', () => {
  const create = vi.fn();
  const findMany = vi.fn();
  const update = vi.fn();
  const deleteMock = vi.fn();

  return {
    prisma: {
      channel: { create, findMany, update, delete: deleteMock },
    },
  };
});

const { prisma } = await import('../../../lib/prisma');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/channels', channelsRouter);
  app.use(errorHandler);
  return app;
};

describe('channels router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a channel with defaults', async () => {
    const app = createApp();
    const mockChannel = {
      id: 'chan-1',
      user_id: '0f750c9f-4b5e-4a46-a95e-5c2ebaa6c6b2',
      name: 'Deep work',
      visibility: 'private',
      target_calendar_id: null,
      color: '#8b5cf6',
      created_at: new Date('2024-01-01T10:00:00.000Z'),
      updated_at: new Date('2024-01-01T10:00:00.000Z'),
    };

    prisma.channel.create.mockResolvedValue(mockChannel);

    const response = await request(app).post('/channels').send({
      userId: mockChannel.user_id,
      name: mockChannel.name,
      color: mockChannel.color,
    });

    expect(response.status).toBe(201);
    expect(prisma.channel.create).toHaveBeenCalledWith({
      data: {
        user_id: mockChannel.user_id,
        name: mockChannel.name,
        visibility: 'private',
        target_calendar_id: undefined,
        color: mockChannel.color,
      },
    });
    expect(response.body).toMatchObject({
      id: mockChannel.id,
      userId: mockChannel.user_id,
      name: mockChannel.name,
      color: mockChannel.color,
    });
  });

  it('lists channels for a user', async () => {
    const app = createApp();
    const channels = [
      {
        id: 'chan-2',
        user_id: '0f750c9f-4b5e-4a46-a95e-5c2ebaa6c6b2',
        name: 'Meetings',
        visibility: 'shared',
        target_calendar_id: 'cal-123',
        color: '#22c55e',
        created_at: new Date('2024-01-02T10:00:00.000Z'),
        updated_at: new Date('2024-01-02T10:00:00.000Z'),
      },
    ];

    prisma.channel.findMany.mockResolvedValue(channels);

    const response = await request(app)
      .get('/channels')
      .query({ userId: channels[0].user_id });

    expect(prisma.channel.findMany).toHaveBeenCalledWith({
      where: { user_id: channels[0].user_id },
      orderBy: { created_at: 'asc' },
    });
    expect(response.status).toBe(200);
    expect(response.body[0]).toMatchObject({
      id: channels[0].id,
      visibility: channels[0].visibility,
    });
  });

  it('updates a channel', async () => {
    const app = createApp();
    const updated = {
      id: '00000000-1111-2222-8333-444444444444',
      user_id: '0f750c9f-4b5e-4a46-a95e-5c2ebaa6c6b2',
      name: 'Personal focus',
      visibility: 'private',
      target_calendar_id: null,
      color: '#f59e0b',
      created_at: new Date('2024-01-02T10:00:00.000Z'),
      updated_at: new Date('2024-01-03T10:00:00.000Z'),
    };

    prisma.channel.update.mockResolvedValue(updated);

    const response = await request(app).patch(`/channels/${updated.id}`).send({
      name: updated.name,
      color: updated.color,
    });

    expect(prisma.channel.update).toHaveBeenCalledWith({
      where: { id: updated.id },
      data: {
        name: updated.name,
        visibility: undefined,
        target_calendar_id: undefined,
        color: updated.color,
      },
    });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ name: updated.name });
  });
});
