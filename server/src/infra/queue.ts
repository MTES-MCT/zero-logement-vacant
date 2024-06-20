import { parseRedisUrl } from 'parse-redis-url-simple';

import { createQueue } from '@zerologementvacant/queue';
import config from '~/infra/config';

const [redis] = parseRedisUrl(config.redis.url);

const queue = createQueue({
  connection: redis,
  defaultJobOptions: {
    attempts: 1_000,
    backoff: {
      type: 'exponential',
      delay: 1_000
    }
  }
});

export default queue;
