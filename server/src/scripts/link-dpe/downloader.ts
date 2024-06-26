import dl from 'download';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { logger } from '~/infra/logger';
import fs from 'fs';
import unzip from 'unzip-stream';

const getArchiveDir = (department: string, opts?: PathOptions): string => {
  const cwd = opts?.cwd ?? '.';
  return path.join(cwd, `dpe-${department}`);
};

interface PathOptions {
  cwd?: string;
}

const exists = async (
  department: string,
  opts?: PathOptions,
): Promise<boolean> => {
  const dir = getArchiveDir(department, opts);
  try {
    const stats = await stat(dir);
    const exists = stats.isDirectory();
    if (exists) {
      logger.info(`Found directory ${dir}.`);
    }
    return exists;
  } catch {
    return false;
  }
};

const download = async (department: string): Promise<void> => {
  return new Promise((resolve) => {
    // TODO : url need to be upgraded every years
    const url = `https://open-data.s3.fr-par.scw.cloud/bdnb_millesime_2023-01-a/millesime_2023-01-a_dep${department}/open_data_millesime_2023-01-a_dep${department}_pgdump.zip`;
    const dir = getArchiveDir(department);

    logger.info(`Downloading file from BNDB...`, {
      department,
      url,
    });

    dl(url)
      .pipe(unzip.Extract({ path: dir }), { end: true })
      .on('data', (chunk) => {
        logger.info(`Received ${chunk.length} bytes of data.`);
      })
      .on('end', () => {
        logger.info(`Downloading done`);
        resolve();
      });
  });
};

const cleanup = async (
  department: string,
  opts?: PathOptions,
): Promise<void> => {
  fs.rmSync(getArchiveDir(department, opts), { recursive: true, force: true });
};

const downloader = {
  download,
  exists,
  getArchiveDir,
  cleanup,
};

export default downloader;
