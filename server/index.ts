import { createServer } from './server';

createServer().start().catch(() => { process.exit(1); })
