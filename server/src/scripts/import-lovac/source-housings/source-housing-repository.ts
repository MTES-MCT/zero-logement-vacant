import { match } from 'ts-pattern';

import { SourceRepository } from '~/scripts/import-lovac/infra';
import { S3RepositoryConfig } from '~/scripts/import-lovac/infra/source-s3-repository';
import { SourceHousing } from '~/scripts/import-lovac/source-housings/source-housing';
import createSourceHousingFileRepository from '~/scripts/import-lovac/source-housings/source-housing-file-repository';
import createSourceHousingS3Repository from '~/scripts/import-lovac/source-housings/source-housing-s3-repository';

interface FileRepositoryOptions {
  from: 'file';
  file: string;
}

interface S3RepositoryOptions extends S3RepositoryConfig {
  from: 's3';
  file: string;
}

type SourceHousingRepositoryOptions =
  | FileRepositoryOptions
  | S3RepositoryOptions;

export function createSourceHousingRepository(
  options: SourceHousingRepositoryOptions
): SourceRepository<SourceHousing> {
  return match(options)
    .with({ from: 'file' }, (opts) =>
      createSourceHousingFileRepository(opts.file)
    )
    .with({ from: 's3' }, (opts) =>
      createSourceHousingS3Repository(opts.file, opts)
    )
    .exhaustive();
}
