import { SourceRepository } from '~/scripts/import-lovac/infra';
import {
  S3RepositoryConfig,
  SourceS3Repository
} from '~/scripts/import-lovac/infra/source-s3-repository';
import { SourceOwner } from '~/scripts/import-lovac/source-owners/source-owner';

class SourceOwnerS3Repository
  extends SourceS3Repository<SourceOwner>
  implements SourceRepository<SourceOwner>
{
  constructor(
    protected file: string,
    protected config: S3RepositoryConfig
  ) {
    super(file, config);
  }
}

function createSourceOwnerS3Repository(
  file: string,
  config: S3RepositoryConfig
): SourceRepository<SourceOwner> {
  return new SourceOwnerS3Repository(file, config);
}

export default createSourceOwnerS3Repository;
