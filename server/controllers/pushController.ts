import { createSession } from 'better-sse';
import { Request, Response } from 'express';

import { logger } from '../utils/logger';
import groupRepository from '../repositories/groupRepository';

const subscribe = async (request: Request, response: Response) => {
  const session = await createSession(request, response);
  const groups = await groupRepository.find();
  setTimeout(() => {
    session.push(groups[0], 'group:finalized');
    logger.debug('Emit group:finalized');
  }, 3_000);
};

export default {
  subscribe,
};
