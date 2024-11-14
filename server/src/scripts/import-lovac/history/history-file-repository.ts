import { ReadableStream, TransformStream } from 'node:stream/web';

import { filter } from '@zerologementvacant/utils/node';
import {
  SourceRepository,
  StreamOptions
} from '~/scripts/import-lovac/infra/source-repository';
import { SourceFileRepository } from '~/scripts/import-lovac/infra/source-file-repository';
import { History } from '~/scripts/import-lovac/history/history';

class HistoryFileRepository
  extends SourceFileRepository<History>
  implements SourceRepository<History>
{
  protected columns: string[] | true = true;

  constructor(protected file: string) {
    super(file);
  }

  stream(options?: StreamOptions): ReadableStream<History> {
    return super.stream().pipeThrough(filterHistory(options));
  }
}

function filterHistory(
  options?: StreamOptions
): TransformStream<History, History> {
  const departments = options?.departments ?? [];

  if (departments.length === 0) {
    return new TransformStream();
  }

  return filter((history) => departments.includes(history.geo_code));
}

function createHistoryFileRepository(file: string): SourceRepository<History> {
  return new HistoryFileRepository(file);
}

export default createHistoryFileRepository;
