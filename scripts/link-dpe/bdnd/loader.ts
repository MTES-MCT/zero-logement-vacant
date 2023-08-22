import path from 'path';
import { logger } from '../../../server/utils/logger';

export async function load(dir: string): Promise<void> {
  logger.info(`Loading BDNB file...`, {
    dir,
  });

  const cmd = `psql $DATABASE_URL -f ${path.join(dir, 'bdnb.sql')}`;
  const exec = require('child_process').exec;

  return new Promise((resolve) => {
    exec(cmd, (error: any, stdout: any, stderr: any) => {
      if (error) {
        console.error(`error: ${error.message}`);
      }
      if (stderr) {
        console.warn(`stderr: ${stderr}`);
      }

      logger.info(`Loading done`);
      resolve(stdout ? stdout : stderr);
    });
  });
}

const loader = {
  load,
};

export default loader;
