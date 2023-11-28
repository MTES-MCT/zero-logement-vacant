import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { db, storage } from '../repositories/db';
import { logger } from '../utils/logger';

export default function transaction() {
  return async (request: Request, response: Response, next: NextFunction) => {
    const transaction = await db.transaction();
    const id = uuidv4();
    logger.debug(`Starting transaction ${id}...`);
    storage.run({ id, transaction }, () => {
      next();
    });
  };
}

interface Handler {
  (req: Request, res: Response): Promise<void>;
}

export function withinTransaction(handler: Handler) {
  return async (request: Request, response: Response) => {
    const transaction = await db.transaction();
    const id = uuidv4();

    await storage.run({ id, transaction }, async () => {
      try {
        logger.debug(`Starting transaction ${id}...`);
        await handler(request, response);
        transaction?.commit();
        logger.debug(`Commit transaction ${id}`);
      } catch (error) {
        transaction?.rollback();
        logger.debug(`Roll back transaction ${id}`);
        throw error;
      }
    });
  };
}
