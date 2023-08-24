import { logger } from '../../server/utils/logger';
import downloader from './downloader';
import loader from './loader';

const departments: string = process.argv[2];

async function run(): Promise<void> {
  for (const departement of departments.split(',')) {
    await processDepartement(departement);
  }
}

async function processDepartement(department: string): Promise<void> {
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
    process.exit();
  });
