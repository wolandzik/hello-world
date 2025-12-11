import type { NextFunction, Request, Response } from 'express';
import type { AnyZodObject, ZodError } from 'zod';
import { HttpError } from '../lib/http-error';

export interface ValidationSchema {
  body?: AnyZodObject;
  params?: AnyZodObject;
  query?: AnyZodObject;
}

export const validateRequest =
  (schema: ValidationSchema) =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }
      next();
    } catch (error) {
      const zodError = error as ZodError;
      const details = zodError.issues?.map((issue) => ({
        message: issue.message,
        path: issue.path,
      }));
      next(new HttpError(400, 'Validation failed', details));
    }
  };
