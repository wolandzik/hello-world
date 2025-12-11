import { Prisma, type Channel, type ChannelVisibility } from '@prisma/client';
import { Router } from 'express';
import { ChannelVisibilityEnum } from '../../lib/prisma-enums';
import { HttpError } from '../../lib/http-error';
import { prisma } from '../../lib/prisma';
import { validateRequest } from '../../middleware/validate-request';
import { z } from '../../lib/zod';

const toChannelResponse = (channel: Channel) => ({
  id: channel.id,
  userId: channel.user_id,
  name: channel.name,
  visibility: channel.visibility,
  targetCalendarId: channel.target_calendar_id ?? null,
  color: channel.color ?? null,
  createdAt: channel.created_at?.toISOString(),
  updatedAt: channel.updated_at?.toISOString(),
});

const channelsRouter = Router();

const hexColorSchema = z
  .string()
  .refine((value) => /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(value), {
    message: 'color must be a hex value like #7755ff',
    path: ['color'],
  });

const createChannelSchema = {
  body: z.object({
    userId: z.string().uuid(),
    name: z.string().min(1),
    visibility: z
      .nativeEnum(ChannelVisibilityEnum)
      .default(ChannelVisibilityEnum.private as ChannelVisibility),
    targetCalendarId: z.string().optional(),
    color: hexColorSchema.optional(),
  }),
};

const listChannelsSchema = {
  query: z.object({ userId: z.string().uuid() }),
};

const channelIdSchema = { params: z.object({ id: z.string().uuid() }) };

const updateChannelSchema = {
  ...channelIdSchema,
  body: z
    .object({
      name: z.string().min(1).optional(),
      visibility: z.nativeEnum(ChannelVisibilityEnum).optional(),
      targetCalendarId: z.string().optional().nullable(),
      color: hexColorSchema.optional().nullable(),
    })
    .refine(
      (body) => Object.values(body).some((value) => value !== undefined),
      { message: 'No changes provided', path: ['name'] }
    ),
};

const handleNotFound = (id: string) => new HttpError(404, `Channel ${id} not found`);

const handleKnownError = (error: unknown, id?: string) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (id && error.code === 'P2025') {
      return handleNotFound(id);
    }
    if (error.code === 'P2003') {
      return new HttpError(400, 'User not found for channel');
    }
  }
  return error;
};

channelsRouter.post('/', validateRequest(createChannelSchema), async (req, res, next) => {
  const { userId, name, visibility, targetCalendarId, color } = req.body;

  try {
    const channel = await prisma.channel.create({
      data: {
        user_id: userId,
        name,
        visibility,
        target_calendar_id: targetCalendarId,
        color,
      },
    });

    res.status(201).json(toChannelResponse(channel));
  } catch (error) {
    next(handleKnownError(error));
  }
});

channelsRouter.get('/', validateRequest(listChannelsSchema), async (req, res, next) => {
  const { userId } = req.query as { userId: string };

  try {
    const channels = await prisma.channel.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'asc' },
    });

    res.json(channels.map(toChannelResponse));
  } catch (error) {
    next(error);
  }
});

channelsRouter.patch(
  '/:id',
  validateRequest(updateChannelSchema),
  async (req, res, next) => {
    const { id } = req.params;
    const { name, visibility, targetCalendarId, color } = req.body;

    try {
      const channel = await prisma.channel.update({
        where: { id },
        data: {
          name,
          visibility,
          target_calendar_id:
            targetCalendarId === undefined ? undefined : targetCalendarId,
          color: color === undefined ? undefined : color,
        },
      });

      res.json(toChannelResponse(channel));
    } catch (error) {
      next(handleKnownError(error, id));
    }
  }
);

channelsRouter.delete(
  '/:id',
  validateRequest(channelIdSchema),
  async (req, res, next) => {
    const { id } = req.params;

    try {
      await prisma.channel.delete({ where: { id } });
      res.status(204).send();
    } catch (error) {
      next(handleKnownError(error, id));
    }
  }
);

export default channelsRouter;
