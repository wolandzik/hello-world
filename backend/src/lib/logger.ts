import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';

type LogLevel = 'info' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  requestId?: string;
  [key: string]: unknown;
}

export const log = (entry: LogEntry) => {
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      ...entry,
    }),
  );
};

export const getRequestId = (req: Request) => {
  const headerId = req.header('x-request-id');
  return headerId ?? randomUUID();
};

export const logRequest = (req: Request, res: Response) => {
  const start = process.hrtime.bigint();
  const requestId = getRequestId(req);

  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    log({
      level: 'info',
      message: 'request_completed',
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
    });
  });
};

export const logError = (entry: LogEntry) => {
  log({ level: 'error', ...entry });
};
