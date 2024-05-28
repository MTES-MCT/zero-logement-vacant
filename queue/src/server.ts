import express from 'express';
import util from 'node:util';

import config from './config';
import registerHealthcheck from './healthcheck';

function createServer() {
  const app = express();

  async function start(): Promise<void> {
    const listen = util.promisify((port: number, cb: () => void) => {
      const listener = app.listen(port, cb);
      registerHealthcheck(listener);
      return listener;
    });

    await listen(config.app.port);
  }

  return {
    app,
    start,
  };
}

export default createServer;
