import { SourceRepository } from '~/scripts/import-lovac/infra/source-repository';
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
}

function createSourceOwnerFileRepository(
  file: string
): SourceRepository<SourceOwner> {
  return new SourceOwnerFileRepository(file);
}

export default createSourceOwnerFileRepository;
