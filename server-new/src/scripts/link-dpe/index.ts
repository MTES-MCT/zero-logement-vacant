import { logger } from '~/infra/logger';
import downloader from './downloader';
import loader from './loader';

const allDepartments = [
  ...Array.from(Array(19).keys()).map((key) =>
    String(key + 1).padStart(2, '0'),
  ),
  '2a',
  '2b',
  ...Array.from(Array(75).keys()).map((key) =>
    String(key + 21).padStart(2, '0'),
  ),
];
const departments: string =
  process.argv[2]?.toLowerCase() ?? allDepartments.join(',');
async function run(): Promise<void> {
  for (const department of departments.split(',')) {
    await processDepartement(department);
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
