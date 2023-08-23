import { logger } from '../../server/utils/logger';
import downloader from './bdnd/downloader';
import loader from './bdnd/loader';

const department = '01';

async function run(): Promise<void> {
  const hasFile = await downloader.exists(department);
  if (!hasFile) {
    await downloader.download(department);
  }
  await loader.loadSchema(department);

  await loader.updateHousingEnergyConsumption(department);

  await loader.dropSchema(department);

  await downloader.cleanup(department);
}

run()
  .catch(logger.error.bind(logger))
  .finally(() => {
    logger.info('Done.');
  });
