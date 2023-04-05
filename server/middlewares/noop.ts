import { NextFunction, Request, Response } from 'express';

export function noop() {
  return (request: Request, response: Response, next: NextFunction): void => {
    next();
  };
}
