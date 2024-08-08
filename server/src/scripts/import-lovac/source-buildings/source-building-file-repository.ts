import { ReadableStream, TransformStream } from 'node:stream/web';

import { SourceFileRepository } from '~/scripts/import-lovac/infra/source-file-repository';
import { SourceBuilding } from '~/scripts/import-lovac/source-buildings/source-building';
import { SourceRepository, StreamOptions } from '~/scripts/import-lovac/infra';
import { filter } from '@zerologementvacant/utils';

class SourceBuildingFileRepository
  extends SourceFileRepository<SourceBuilding>
  implements SourceRepository<SourceBuilding>
{
  protected columns: string[] | true = true;

  constructor(protected file: string) {
    super(file);
  }

  stream(options?: StreamOptions): ReadableStream<SourceBuilding> {
    return super.stream().pipeThrough(filterSourceBuilding(options));
  }
}

function filterSourceBuilding(
  options?: StreamOptions
): TransformStream<SourceBuilding, SourceBuilding> {
  const departments = options?.departments ?? [];

  if (departments.length === 0) {
    return new TransformStream();
  }

  return filter((sourceBuilding) =>
    departments.includes(sourceBuilding.building_id.substring(0, 2))
  );
}

function createSourceBuildingFileRepository(
  file: string
): SourceRepository<SourceBuilding> {
  return new SourceBuildingFileRepository(file);
}

export default createSourceBuildingFileRepository;
