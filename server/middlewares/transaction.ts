import { v4 as uuidv4 } from 'uuid';

import { db, storage } from '../repositories/db';
import { logger } from '../utils/logger';

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
