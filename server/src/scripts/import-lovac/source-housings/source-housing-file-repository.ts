import { SourceRepository } from '~/scripts/import-lovac/infra';
import { SourceHousing } from '~/scripts/import-lovac/source-housings/source-housing';
import { SourceFileRepository } from '~/scripts/import-lovac/infra/source-file-repository';

class SourceHousingFileRepository
  extends SourceFileRepository<SourceHousing>
  implements SourceRepository<SourceHousing>
{
  protected columns: string[] = [
    // TODO: fill up
  ];

  constructor(protected file: string) {
    super(file);
  }
}

function createSourceHousingFileRepository(
  file: string
): SourceRepository<SourceHousing> {
  return new SourceHousingFileRepository(file);
}

export default createSourceHousingFileRepository;
