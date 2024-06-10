import { Client } from 'pg';

import { Check } from './check';

export function postgresCheck(url: string): Check {
  return {
    name: 'postgres',
    async test() {
      const client = new Client(url);
      await client.connect();
      await client.end();
    },
  };
}
