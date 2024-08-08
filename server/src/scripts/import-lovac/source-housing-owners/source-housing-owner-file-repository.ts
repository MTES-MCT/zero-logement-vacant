import { ReadableStream, TransformStream } from 'node:stream/web';

import { filter } from '@zerologementvacant/utils';
import { SourceFileRepository } from '~/scripts/import-lovac/infra/source-file-repository';
import { SourceHousingOwner } from '~/scripts/import-lovac/source-housing-owners/source-housing-owner';
import { SourceRepository, StreamOptions } from '~/scripts/import-lovac/infra';

class SourceHousingOwnerFileRepository
  extends SourceFileRepository<SourceHousingOwner>
  implements SourceRepository<SourceHousingOwner>
{
  protected columns: string[] | true = true;

  constructor(protected file: string) {
    super(file);
  }

  stream(options?: StreamOptions): ReadableStream<SourceHousingOwner> {
    return super.stream().pipeThrough(filterSourceHousingOwner(options));
  }
}

function filterSourceHousingOwner(
  options?: StreamOptions
): TransformStream<SourceHousingOwner, SourceHousingOwner> {
  const departments = options?.departments ?? [];

  if (departments.length === 0) {
    return new TransformStream();
  }

  return filter((sourceHousingOwner) =>
    departments.includes(sourceHousingOwner.local_id.substring(0, 2))
  );
}

function createSourceHousingOwnerFileRepository(
  file: string
): SourceRepository<SourceHousingOwner> {
  return new SourceHousingOwnerFileRepository(file);
}

export default createSourceHousingOwnerFileRepository;
