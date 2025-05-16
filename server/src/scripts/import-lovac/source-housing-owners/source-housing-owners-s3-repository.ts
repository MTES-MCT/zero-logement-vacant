import { SourceRepository } from '~/scripts/import-lovac/infra';
import {
  S3RepositoryConfig,
  SourceS3Repository
} from '~/scripts/import-lovac/infra/source-s3-repository';
import { SourceHousingOwner } from '~/scripts/import-lovac/source-housing-owners/source-housing-owner';

class SourceHousingOwnersS3Repository
  extends SourceS3Repository<SourceHousingOwner>
  implements SourceRepository<SourceHousingOwner>
{
  constructor(
    protected file: string,
    protected config: S3RepositoryConfig
  ) {
    super(file, config);
  }
}

function createSourceHousingOwnerS3Repository(
  file: string,
  config: S3RepositoryConfig
): SourceRepository<SourceHousingOwner> {
  return new SourceHousingOwnersS3Repository(file, config);
}

export default createSourceHousingOwnerS3Repository;
