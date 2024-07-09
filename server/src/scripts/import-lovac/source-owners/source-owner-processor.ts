import { WritableStream } from 'node:stream/web';
import { v4 as uuidv4 } from 'uuid';

import { SourceOwner } from '~/scripts/import-lovac/source-owners/source-owner';
import { ReporterOptions } from '~/scripts/import-lovac/infra/reporters';
import { createLogger } from '~/infra/logger';
import { OwnerApi } from '~/models/OwnerApi';
import { ConflictOptions } from '~/infra/database';
import { OwnerDBO } from '~/repositories/ownerRepository';

export async function process(record: SourceOwner): Promise<SourceOwner> {
  return record;
}

interface ProcessorOptions extends ReporterOptions<SourceOwner> {
  ownerRepository: {
    save(owner: OwnerApi, opts?: ConflictOptions<OwnerDBO>): Promise<void>;
  };
}

const logger = createLogger('sourceOwnerProcessor');

export function sourceOwnerProcessor(opts: ProcessorOptions) {
  const { ownerRepository, reporter } = opts;

  return new WritableStream<SourceOwner>({
    async write(chunk, controller) {
      try {
        logger.debug('Processing source owner...', { chunk });

        const owner: OwnerApi = {
          id: uuidv4(),
          idpersonne: chunk.idpersonne,
          rawAddress: [chunk.raw_address],
          fullName: chunk.full_name,
          birthDate: chunk.birth_date ? new Date(chunk.birth_date) : undefined,
          email: undefined,
          phone: undefined,
          banAddress: undefined,
          additionalAddress: undefined
        };
        await ownerRepository.save(owner, {
          onConflict: ['idpersonne'],
          merge: ['raw_address', 'full_name', 'birth_date']
        });
        reporter.passed(chunk);
      } catch (error) {
        controller.error(error);
      }
    }
  });
}

export default sourceOwnerProcessor;
