import { createClient } from 'redis';

import { Check } from './check';

export function redisCheck(url: string): Check {
  return {
    name: 'redis',
    async test() {
      const client = createClient({ url, });
      await client.connect();
      await client.disconnect();
    },
  };
}
