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

type Handler<R> = () => Promise<R>;

export async function withinTransaction<R>(handler: Handler<R>): Promise<R> {
  const transaction = await db.transaction();
  const id = uuidv4();

  return storage.run({ id, transaction }, async () => {
    try {
      logger.debug(`Starting transaction ${id}...`);
      const returned = await handler();
      await transaction?.commit();
      logger.debug(`Commit transaction ${id}`);
      return returned;
    } catch (error) {
      await transaction?.rollback();
      logger.debug(`Roll back transaction ${id}`);
      throw error;
    }
  });
}
