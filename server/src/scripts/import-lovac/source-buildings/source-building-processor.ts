import { WritableStream } from 'node:stream/web';

import { createLogger } from '~/infra/logger';
import { BuildingApi } from '~/models/BuildingApi';
import { ReporterError, ReporterOptions } from '~/scripts/import-lovac/infra';
import { SourceBuilding } from '~/scripts/import-lovac/source-buildings/source-building';

const logger = createLogger('sourceBuildingProcessor');

export interface ProcessorOptions extends ReporterOptions<SourceBuilding> {
  buildingRepository: {
    save(building: BuildingApi): Promise<void>;
  };
}

export function createSourceBuildingProcessor(options: ProcessorOptions) {
  const { abortEarly, buildingRepository, reporter } = options;

  return new WritableStream<SourceBuilding>({
    async write(chunk) {
      try {
        logger.debug('Processing source building...', { chunk });
        const building: BuildingApi = {
          id: chunk.building_id,
          vacantHousingCount: chunk.housing_vacant_count,
          rentHousingCount: chunk.housing_rent_count,
          // Should be provided later, by the file
          housingCount: 0,
          rnb: null,
          dpe: null,
          ges: null,
          heating: null,
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
