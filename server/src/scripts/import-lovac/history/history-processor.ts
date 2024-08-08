import fp from 'lodash/fp';
import { WritableStream } from 'node:stream/web';

import { ReporterError, ReporterOptions } from '~/scripts/import-lovac/infra';
import { History } from '~/scripts/import-lovac/history/history';
import { HousingApi } from '~/models/HousingApi';

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
        const dataFileYears: string[] = normalize(chunk.files_years);
        if (dataFileYears.length > 0) {
          await housingRepository.update(
            {
              geoCode: chunk.ff_idlocal.substring(0, 5),
              localId: chunk.ff_idlocal
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

export function normalize(dataFileYears: string[]): string[] {
  return fp.pipe(
    fp.sortBy<string>(fp.identity),
    fp.sortedUniq,
    // "lovac-2024" should be added later to the array by the `housings` command
    fp.filter((dataFileYear) => dataFileYear !== 'lovac-2024')
  )(dataFileYears);
}
