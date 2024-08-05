import { ReadableStream } from 'node:stream/web';

import { SourceFileRepository } from '~/scripts/import-lovac/infra/source-file-repository';
import { SourceHousingOwner } from '~/scripts/import-lovac/source-housing-owners/source-housing-owner';
import { SourceRepository } from '~/scripts/import-lovac/infra';

class SourceHousingOwnerFileRepository
  extends SourceFileRepository<SourceHousingOwner>
  implements SourceRepository<SourceHousingOwner>
{
  protected columns: string[] | true = true;

  constructor(protected file: string) {
    super(file);
  }

  stream(): ReadableStream<SourceHousingOwner> {
    return super.stream();
  }
}

function createSourceHousingOwnerFileRepository(
  file: string
): SourceRepository<SourceHousingOwner> {
  return new SourceHousingOwnerFileRepository(file);
}

export default createSourceHousingOwnerFileRepository;
