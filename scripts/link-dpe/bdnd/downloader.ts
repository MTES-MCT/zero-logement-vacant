import dl from 'download';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { logger } from '../../../server/utils/logger';
import fs from 'fs';

const getArchiveDir = (department: string, opts?: PathOptions): string => {
  const cwd = opts?.cwd ?? '.';
  return path.join(cwd, `dpe-${department}`);
};

interface PathOptions {
  cwd?: string;
}

const exists = async (
  department: string,
  opts?: PathOptions
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
  const url = `https://open-data.s3.fr-par.scw.cloud/bdnb_millesime_2022-10-d/millesime_2022-10-d_dep${department}/open_data_millesime_2022-10-d_dep${department}_pgdump.zip`;
  const dir = getArchiveDir(department);
  logger.info(`Downloading file from BNDB...`, {
    department,
    url,
  });

  await dl(url, dir, {
    extract: true,
  });

  logger.info(`Downloading done`);
};

const cleanup = async (
  department: string,
  opts?: PathOptions
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
