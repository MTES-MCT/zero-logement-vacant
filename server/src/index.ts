import { createServer } from '~/infra/server';

createServer()
  .start()
  .catch(() => {
    process.exit(1);
  });
