import { parseRedisUrl } from 'parse-redis-url-simple';

import { createQueue } from '@zerologementvacant/queue';
import config from '~/infra/config';

const [redis] = parseRedisUrl(config.redis.url);

console.log(config.redis.url)

const queue = createQueue({
  connection: redis,
  defaultJobOptions: {
    // @ts-expect-error: timeout is valid at runtime
    timeout: 10 * 60 * 1000,   // 5 min instead of 30 s
    attempts: 1_000,
    backoff: {
      type: 'exponential',
      delay: 1_000
    }
  }
});

export default queue;
