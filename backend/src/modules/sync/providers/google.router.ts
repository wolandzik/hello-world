import { Provider, TimeBlockStatus } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../../../lib/prisma';
import { ProviderEnum, TimeBlockStatusEnum } from '../../../lib/prisma-enums';
import { HttpError } from '../../../lib/http-error';
import { z } from '../../../lib/zod';
import { validateRequest } from '../../../middleware/validate-request';

const syncProviderRouter = Router();

const oauthStartSchema = {
  body: z.object({
    userId: z.string().uuid(),
    scopes: z.array(z.string()).nonempty(),
    accessToken: z.string(),
    refreshToken: z.string().optional(),
    expiresAt: z.string().datetime().optional(),
  }),
};

syncProviderRouter.post(
  '/connect',
  validateRequest(oauthStartSchema),
  async (req, res, next) => {
    const { userId, scopes, accessToken, refreshToken, expiresAt } = req.body;

    try {
      const integration = await prisma.calendarIntegration.upsert({
        where: {
          user_id_provider: { user_id: userId, provider: 'google' },
        },
        update: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt ? new Date(expiresAt) : null,
          sync_state: { scopes },
        },
        create: {
          user_id: userId,
          provider: 'google',
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt ? new Date(expiresAt) : null,
          sync_state: { scopes },
        },
      });

      res
        .status(202)
        .json({
          provider: 'google',
          userId,
          scopes,
          status: 'connected',
          integrationId: integration.id,
        });
    } catch (error) {
      next(error);
    }
  }
);

syncProviderRouter.post(
  '/disconnect',
  validateRequest({ body: z.object({ userId: z.string().uuid() }) }),
  async (req, res, next) => {
    const { userId } = req.body;

    try {
      await prisma.calendarIntegration.deleteMany({
        where: { user_id: userId, provider: 'google' },
      });

      res.json({ provider: 'google', status: 'disconnected' });
    } catch (error) {
      next(error);
    }
  }
);

syncProviderRouter.post('/webhook', (_req, res) => {
  res.json({ provider: 'google', message: 'Webhook received' });
});

syncProviderRouter.get(
  '/status',
  validateRequest({ query: z.object({ userId: z.string().uuid() }) }),
  async (req, res, next) => {
    const { userId } = req.query as { userId: string };

    try {
      const integration = await prisma.calendarIntegration.findFirst({
        where: { user_id: userId, provider: ProviderEnum.google as Provider },
      });

      if (!integration) {
        return res.json({ status: 'disconnected', provider: 'google' });
      }

      const syncState = (integration.sync_state as Record<string, unknown>) ?? {};

      res.json({
        status: 'connected',
        provider: 'google',
        integrationId: integration.id,
        lastSyncedAt: syncState.lastSyncAt ?? null,
        syncMode: integration.sync_mode,
        calendarId: integration.calendar_id ?? null,
      });
    } catch (error) {
      next(error);
    }
  }
);

const pullEventsSchema = {
  body: z.object({
    userId: z.string().uuid(),
    events: z
      .array(
        z.object({
          id: z.string(),
          title: z.string(),
          startAt: z.string().datetime(),
          endAt: z.string().datetime(),
          status: z
            .nativeEnum(TimeBlockStatusEnum)
            .default(TimeBlockStatusEnum.tentative as TimeBlockStatus),
          calendarId: z.string().optional(),
          recurrenceRule: z.string().optional(),
          location: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .default([]),
    cursor: z.string().optional(),
    calendarId: z.string().optional(),
  }),
};

syncProviderRouter.post(
  '/poll',
  validateRequest(pullEventsSchema),
  async (req, res, next) => {
    const { userId, events, cursor, calendarId } = req.body;

    try {
      const integration = await prisma.calendarIntegration.findFirst({
        where: { user_id: userId, provider: ProviderEnum.google as Provider },
      });

      if (!integration) {
        throw new HttpError(404, 'Google integration not found for user');
      }

      const syncedBlocks = [] as Array<ReturnType<typeof mapToResponse>>;

      for (const event of events) {
        const channel = event.calendarId
          ? await prisma.channel.findFirst({
              where: {
                user_id: userId,
                target_calendar_id: event.calendarId,
              },
            })
          : null;

        const timeblock = await prisma.timeBlock.upsert({
          where: {
            user_id_calendar_event_id: {
              user_id: userId,
              calendar_event_id: event.id,
            },
          },
          update: {
            start_at: new Date(event.startAt),
            end_at: new Date(event.endAt),
            status: event.status,
            channel_id: channel?.id ?? null,
            recurrence_rule: event.recurrenceRule ?? null,
            location: event.location ?? null,
            notes: event.notes ?? null,
          },
          create: {
            user_id: userId,
            start_at: new Date(event.startAt),
            end_at: new Date(event.endAt),
            status: event.status,
            provider: ProviderEnum.google as Provider,
            calendar_event_id: event.id,
            recurrence_rule: event.recurrenceRule ?? null,
            location: event.location ?? null,
            notes: event.notes ?? null,
            channel_id: channel?.id ?? null,
          },
        });

        syncedBlocks.push(mapToResponse(timeblock));
      }

      const lastSyncAt = new Date().toISOString();

      await prisma.calendarIntegration.update({
        where: { id: integration.id },
        data: {
          calendar_id: calendarId ?? integration.calendar_id,
          sync_state: {
            ...(integration.sync_state as Record<string, unknown>),
            lastSyncAt,
            cursor: cursor ?? null,
          },
        },
      });

      res.json({
        provider: 'google',
        synced: syncedBlocks.length,
        lastSyncAt,
        timeblocks: syncedBlocks,
      });
    } catch (error) {
      next(error);
    }
  }
);

const mapToResponse = (timeblock: {
  id: string;
  user_id: string;
  task_id?: string | null;
  channel_id?: string | null;
  start_at: Date;
  end_at: Date;
  status: TimeBlockStatus;
  provider: Provider;
  location?: string | null;
  notes?: string | null;
  calendar_event_id?: string | null;
  recurrence_rule?: string | null;
  created_at?: Date;
  updated_at?: Date;
}) => ({
  id: timeblock.id,
  userId: timeblock.user_id,
  taskId: timeblock.task_id ?? null,
  channelId: timeblock.channel_id ?? null,
  startAt: timeblock.start_at.toISOString(),
  endAt: timeblock.end_at.toISOString(),
  status: timeblock.status,
  provider: timeblock.provider,
  location: timeblock.location ?? null,
  notes: timeblock.notes ?? null,
  calendarEventId: timeblock.calendar_event_id ?? null,
  recurrenceRule: timeblock.recurrence_rule ?? null,
  createdAt: timeblock.created_at?.toISOString(),
  updatedAt: timeblock.updated_at?.toISOString(),
});

export default syncProviderRouter;
