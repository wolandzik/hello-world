import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/http-error';
import { logError } from '../lib/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const status = err instanceof HttpError ? err.status : 500;
  const requestId = res.getHeader('x-request-id') as string | undefined;

  logError({
    message: err.message,
    level: 'error',
    requestId,
    stack: err.stack,
    details: err instanceof HttpError ? err.details : undefined,
  });

  res.status(status).json({
    error: {
      message: err.message,
      details: err instanceof HttpError ? err.details : undefined,
      requestId,
    },
  });
};
