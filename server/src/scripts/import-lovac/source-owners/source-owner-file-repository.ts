import { ReadableStream, TransformStream } from 'node:stream/web';

import { filter } from '@zerologementvacant/utils';
import {
  SourceRepository,
  StreamOptions
} from '~/scripts/import-lovac/infra/source-repository';
import { SourceOwner } from '~/scripts/import-lovac/source-owners/source-owner';
import { SourceFileRepository } from '~/scripts/import-lovac/infra/source-file-repository';

class SourceOwnerFileRepository
  extends SourceFileRepository<SourceOwner>
  implements SourceRepository<SourceOwner>
{
  protected columns: string[] | true = true;

  constructor(protected file: string) {
    super(file);
  }

  stream(options?: StreamOptions): ReadableStream<SourceOwner> {
    return super.stream().pipeThrough(filterSourceOwner(options));
  }
}

function filterSourceOwner(
  options?: StreamOptions
): TransformStream<SourceOwner, SourceOwner> {
  const departments = options?.departments ?? [];

  if (departments.length === 0) {
    return new TransformStream();
  }

  return filter((sourceOwner) =>
    departments.includes(sourceOwner.idpersonne.substring(0, 2))
  );
}

function createSourceOwnerFileRepository(
  file: string
): SourceRepository<SourceOwner> {
  return new SourceOwnerFileRepository(file);
}

export default createSourceOwnerFileRepository;
