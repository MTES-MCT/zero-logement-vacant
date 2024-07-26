import { ReadableStream, TransformStream } from 'node:stream/web';

import { SourceRepository, StreamOptions } from '~/scripts/import-lovac/infra';
import { SourceHousing } from '~/scripts/import-lovac/source-housings/source-housing';
import { SourceFileRepository } from '~/scripts/import-lovac/infra/source-file-repository';

class SourceHousingFileRepository
  extends SourceFileRepository<SourceHousing>
  implements SourceRepository<SourceHousing>
{
  protected columns: string[] | true = true;

  constructor(protected file: string) {
    super(file);
  }

  stream(options?: StreamOptions): ReadableStream<SourceHousing> {
    return super.stream().pipeThrough(filter(options));
  }
}

function filter(
  options?: StreamOptions
): TransformStream<SourceHousing, SourceHousing> {
  if (!options?.departments?.length) {
    return new TransformStream();
  }

  return new TransformStream<SourceHousing, SourceHousing>({
    async transform(sourceHousing, controller) {
      const isInDepartment = options?.departments?.includes(
        sourceHousing.geo_code.substring(0, 2)
      );

      if (isInDepartment) {
        controller.enqueue(sourceHousing);
        return;
      }
    }
  });
}

function createSourceHousingFileRepository(
  file: string
): SourceRepository<SourceHousing> {
  return new SourceHousingFileRepository(file);
}

export default createSourceHousingFileRepository;
