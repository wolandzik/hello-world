import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../../middleware/error-handler';
import { ProviderEnum, TimeBlockStatusEnum } from '../../../lib/prisma-enums';
import syncProviderRouter from '../providers/google.router';

vi.mock('../../../lib/prisma', () => {
  const calendarFindFirst = vi.fn();
  const calendarUpsert = vi.fn();
  const calendarDeleteMany = vi.fn();
  const calendarUpdate = vi.fn();
  const timeBlockUpsert = vi.fn();
  const channelFindFirst = vi.fn();

  return {
    prisma: {
      calendarIntegration: {
        findFirst: calendarFindFirst,
        upsert: calendarUpsert,
        deleteMany: calendarDeleteMany,
        update: calendarUpdate,
      },
      timeBlock: { upsert: timeBlockUpsert },
      channel: { findFirst: channelFindFirst },
    },
  };
});

const { prisma } = await import('../../../lib/prisma');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/sync/providers/google', syncProviderRouter);
  app.use(errorHandler);
  return app;
};

describe('google sync router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports disconnected status when no integration exists', async () => {
    const app = createApp();

    prisma.calendarIntegration.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .get('/sync/providers/google/status')
      .query({ userId: '7b9c62e8-1434-4f36-80f6-6a92ad83f3be' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('disconnected');
  });

  it('polls events and upserts timeblocks tied to calendar channels', async () => {
    const app = createApp();

    const integration = {
      id: 'integration-1',
      user_id: 'f33d5c8b-01d5-4f57-8e8b-395260ae93e7',
      provider: ProviderEnum.google,
      access_token: 'token',
      refresh_token: null,
      expires_at: null,
      sync_state: null,
      sync_mode: 'polling',
      calendar_id: null,
    };

    prisma.calendarIntegration.findFirst.mockResolvedValue(integration);
    prisma.calendarIntegration.update.mockResolvedValue({ ...integration, calendar_id: 'primary' });
    prisma.channel.findFirst.mockResolvedValue({ id: 'channel-1' });
    prisma.timeBlock.upsert.mockResolvedValue({
      id: 'block-1',
      user_id: integration.user_id,
      task_id: null,
      channel_id: 'channel-1',
      start_at: new Date('2024-05-01T10:00:00.000Z'),
      end_at: new Date('2024-05-01T11:00:00.000Z'),
      status: TimeBlockStatusEnum.confirmed,
      provider: ProviderEnum.google,
      location: null,
      notes: 'Synced event',
      calendar_event_id: 'evt-1',
      recurrence_rule: null,
      created_at: new Date('2024-05-01T09:50:00.000Z'),
      updated_at: new Date('2024-05-01T09:50:00.000Z'),
    });

    const response = await request(app)
      .post('/sync/providers/google/poll')
      .send({
        userId: integration.user_id,
        calendarId: 'primary',
        cursor: 'next-page',
        events: [
          {
            id: 'evt-1',
            title: 'Team standup',
            startAt: '2024-05-01T10:00:00.000Z',
            endAt: '2024-05-01T11:00:00.000Z',
            status: TimeBlockStatusEnum.confirmed,
            calendarId: 'primary',
            notes: 'Synced event',
          },
        ],
      });

    expect(prisma.timeBlock.upsert).toHaveBeenCalledWith({
      where: {
        user_id_calendar_event_id: {
          user_id: integration.user_id,
          calendar_event_id: 'evt-1',
        },
      },
      update: expect.objectContaining({
        start_at: new Date('2024-05-01T10:00:00.000Z'),
        status: TimeBlockStatusEnum.confirmed,
        channel_id: 'channel-1',
      }),
      create: expect.objectContaining({
        provider: ProviderEnum.google,
        calendar_event_id: 'evt-1',
        channel_id: 'channel-1',
      }),
    });

    expect(prisma.calendarIntegration.update).toHaveBeenCalledWith({
      where: { id: integration.id },
      data: expect.objectContaining({
        sync_state: expect.objectContaining({ cursor: 'next-page' }),
        calendar_id: 'primary',
      }),
    });

    expect(response.status).toBe(200);
    expect(response.body.synced).toBe(1);
    expect(response.body.timeblocks[0].calendarEventId).toBe('evt-1');
  });
});
