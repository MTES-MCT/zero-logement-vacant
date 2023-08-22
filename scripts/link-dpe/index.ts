import { logger } from '../../server/utils/logger';
import downloader from './bdnd/downloader';
import loader from './bdnd/loader';

async function run(): Promise<void> {
  const hasFile = await downloader.exists('01');
  if (!hasFile) {
    await downloader.download('01');
  }
  await loader.load(downloader.getArchive('01'));
}

run()
  .catch(logger.error.bind(logger))
  .finally(() => {
    logger.info('Done.');
  });
