import { SourceRepository } from '~/scripts/import-lovac/infra/source-repository';
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
}

function createHistoryFileRepository(file: string): SourceRepository<History> {
  return new HistoryFileRepository(file);
}

export default createHistoryFileRepository;
