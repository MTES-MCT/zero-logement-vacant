import { match } from 'ts-pattern';

import { SourceRepository } from '~/scripts/import-lovac/infra';
import { S3RepositoryConfig } from '~/scripts/import-lovac/infra/source-s3-repository';
import { SourceHousingOwner } from '~/scripts/import-lovac/source-housing-owners/source-housing-owner';
import createSourceHousingOwnerFileRepository from '~/scripts/import-lovac/source-housing-owners/source-housing-owner-file-repository';
import createSourceHousingOwnerS3Repository from '~/scripts/import-lovac/source-housing-owners/source-housing-owners-s3-repository';

interface FileRepositoryOptions {
  from: 'file';
  file: string;
}

interface S3RepositoryOptions extends S3RepositoryConfig {
  from: 's3';
  file: string;
}

type SourceHousingOwnerRepositoryOptions =
  | FileRepositoryOptions
  | S3RepositoryOptions;

export function createSourceHousingOwnerRepository(
  options: SourceHousingOwnerRepositoryOptions
): SourceRepository<SourceHousingOwner> {
  return match(options)
    .with({ from: 'file' }, (opts) =>
      createSourceHousingOwnerFileRepository(opts.file)
    )
    .with({ from: 's3' }, (opts) =>
      createSourceHousingOwnerS3Repository(opts.file, opts)
    )
    .exhaustive();
}
