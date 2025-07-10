import { DataFileYear } from '@zerologementvacant/models';
import { WritableStream } from 'node:stream/web';
import { HousingApi, normalizeDataFileYears } from '~/models/HousingApi';
import { History } from '~/scripts/import-lovac/history/history';

import { ReporterError, ReporterOptions } from '~/scripts/import-lovac/infra';

interface ProcessorOptions extends ReporterOptions<History> {
  housingRepository: {
    update(
      { geoCode, localId }: Pick<HousingApi, 'geoCode' | 'localId'>,
      housing: Pick<HousingApi, 'dataFileYears'>
    ): Promise<void>;
  };
}

export function historyProcessor(opts: ProcessorOptions) {
  const { abortEarly, housingRepository, reporter } = opts;

  return new WritableStream<History>({
    async write(chunk) {
      try {
        const dataFileYears: DataFileYear[] = normalizeDataFileYears(
          chunk.file_years
        );
        if (dataFileYears.length > 0) {
          await housingRepository.update(
            {
              geoCode: chunk.geo_code,
              localId: chunk.local_id
            },
            { dataFileYears }
          );
          reporter.passed(chunk);
          return;
        }

        reporter.skipped(chunk);
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
