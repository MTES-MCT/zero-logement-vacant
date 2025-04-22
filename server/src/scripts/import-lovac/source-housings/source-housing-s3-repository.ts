import { SourceRepository } from '~/scripts/import-lovac/infra';
import {
  S3RepositoryConfig,
  SourceS3Repository
} from '~/scripts/import-lovac/infra/source-s3-repository';
import { SourceHousing } from '~/scripts/import-lovac/source-housings/source-housing';

class SourceHousingS3Repository
  extends SourceS3Repository<SourceHousing>
  implements SourceRepository<SourceHousing>
{
  constructor(
    protected file: string,
    protected config: S3RepositoryConfig
  ) {
    super(file, config);
  }
}

function createSourceHousingS3Repository(
  file: string,
  config: S3RepositoryConfig
): SourceRepository<SourceHousing> {
  return new SourceHousingS3Repository(file, config);
}

export default createSourceHousingS3Repository;
