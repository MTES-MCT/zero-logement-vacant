import { match } from 'ts-pattern';

import { SourceRepository } from '~/scripts/import-lovac/infra';
import { S3RepositoryConfig } from '~/scripts/import-lovac/infra/source-s3-repository';
import { SourceOwner } from '~/scripts/import-lovac/source-owners/source-owner';
import createSourceOwnerFileRepository from '~/scripts/import-lovac/source-owners/source-owner-file-repository';
import createSourceOwnerS3Repository from '~/scripts/import-lovac/source-owners/source-owner-s3-repository';

interface FileRepositoryOptions {
  from: 'file';
  file: string;
}

interface S3RepositoryOptions extends S3RepositoryConfig {
  from: 's3';
  file: string;
}

type SourceOwnerRepositoryOptions = FileRepositoryOptions | S3RepositoryOptions;

export function createSourceOwnerRepository(
  options: SourceOwnerRepositoryOptions
): SourceRepository<SourceOwner> {
  return match(options)
    .with({ from: 'file' }, (opts) =>
      createSourceOwnerFileRepository(opts.file)
    )
    .with({ from: 's3' }, (opts) =>
      createSourceOwnerS3Repository(opts.file, opts)
    )
    .exhaustive();
}
