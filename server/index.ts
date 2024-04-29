import { createServer } from './server';

createServer()
  .start()
  .catch(() => {
    process.exit(1);
  });

console.log('Remove this log');
