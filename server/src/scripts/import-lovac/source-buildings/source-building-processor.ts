import { WritableStream } from 'node:stream/web';

import { createLogger } from '~/infra/logger';
import { ReporterError, ReporterOptions } from '~/scripts/import-lovac/infra';
import { SourceBuilding } from '~/scripts/import-lovac/source-buildings/source-building';
import { BuildingApi } from '~/models/BuildingApi';

const logger = createLogger('sourceBuildingProcessor');

export interface ProcessorOptions extends ReporterOptions<SourceBuilding> {
  buildingRepository: {
    save(building: BuildingApi): Promise<void>;
  };
}

export function sourceBuildingProcessor(options: ProcessorOptions) {
  const { abortEarly, buildingRepository, reporter } = options;

  return new WritableStream<SourceBuilding>({
    async write(chunk) {
      try {
        logger.debug('Processing source building...', { chunk });
        const building: BuildingApi = {
          id: chunk.building_id,
          vacantHousingCount: chunk.housing_vacant_count,
          rentHousingCount: chunk.housing_rent_count,
          housingCount: 0 // Should be provided later, by the file
        };
        await buildingRepository.save(building);
        reporter.passed(chunk);
      } catch (error) {
        reporter.failed(
          chunk,
          new ReporterError((error as Error).message, chunk)
        );

        if (abortEarly) {
          throw error;
        }
      }
    }
  });
}
