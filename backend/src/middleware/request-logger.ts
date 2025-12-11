import type { Request, Response, NextFunction } from 'express';
import { logRequest } from '../lib/logger';

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logRequest(req, res);
  next();
};
