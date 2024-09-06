import { ReadableStream, TransformStream } from 'node:stream/web';

import { filter } from '@zerologementvacant/utils';
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
    return super.stream().pipeThrough(filterSourceHousing(options));
  }
}

function filterSourceHousing(
  options?: StreamOptions
): TransformStream<SourceHousing, SourceHousing> {
  const departments = options?.departments ?? [];

  if (departments.length === 0) {
    return new TransformStream();
  }

  return filter((sourceHousing) =>
    departments.includes(sourceHousing.geo_code.substring(0, 2))
  );
}

function createSourceHousingFileRepository(
  file: string
): SourceRepository<SourceHousing> {
  return new SourceHousingFileRepository(file);
}

export default createSourceHousingFileRepository;
