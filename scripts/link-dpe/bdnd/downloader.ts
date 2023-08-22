import dl from 'download';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { logger } from '../../../server/utils/logger';

const getArchive = (department: string): string => `dpe-${department}`;

interface IsPresentOptions {
  cwd?: string;
}

export async function exists(
  department: string,
  opts?: IsPresentOptions
): Promise<boolean> {
  const cwd = opts?.cwd ?? '.';
  const archive = path.join(cwd, getArchive(department));
  try {
    const stats = await stat(archive);
    const exists = stats.isDirectory();
    if (exists) {
      logger.info(`Found directory ${archive}.`);
    }
    return exists;
  } catch {
    return false;
  }
}

export async function download(department: string): Promise<void> {
  const url = `https://open-data.s3.fr-par.scw.cloud/bdnb_millesime_2022-10-d/millesime_2022-10-d_dep${department}/open_data_millesime_2022-10-d_dep${department}_pgdump.zip`;
  const dir = getArchive(department);
  logger.info(`Downloading file from BNDB...`, {
    department,
    url,
  });

  await dl(url, dir, {
    extract: true,
  });
}

const downloader = {
  download,
  exists,
  getArchive,
};

export default downloader;
