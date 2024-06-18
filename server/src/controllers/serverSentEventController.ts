import { Request, Response } from 'express';
import { constants } from 'http2';

import { JOBS } from '@zerologementvacant/queue';
import { logger } from '~/infra/logger';
import queue from '~/infra/queue';

function handle(request: Request, response: Response): void {
  const headers = {
    'Content-Type': 'text/event-stream',
    Connection: 'keep-alive',
    'Cache-Control': 'no-cache'
  };
  response.writeHead(constants.HTTP_STATUS_OK, headers);

  JOBS.forEach((job) => {
    queue.on(job, (data) => {
      logger.info('Queue event received', data);
      response.write(`event: ${job}\n`);
      response.write(`data: ${JSON.stringify(data)}\n\n`);
      response.end();
    });
  });

  request.on('close', () => {
    logger.info('Connection closed by client');
  });
}

export default {
  handle
};
