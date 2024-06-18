import { parseRedisUrl } from 'parse-redis-url-simple';

import { createQueue } from '@zerologementvacant/queue';
import config from '~/infra/config';

const [redis] = parseRedisUrl(config.redis.url);

const queue = createQueue({
  connection: redis,
});

export default queue;
