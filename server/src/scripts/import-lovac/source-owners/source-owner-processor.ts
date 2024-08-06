import { WritableStream } from 'node:stream/web';
import { v4 as uuidv4 } from 'uuid';

import { SourceOwner } from '~/scripts/import-lovac/source-owners/source-owner';
import {
  ReporterError,
  ReporterOptions
} from '~/scripts/import-lovac/infra/reporters';
import { createLogger } from '~/infra/logger';
import { OwnerDBO } from '~/repositories/ownerRepository';

const logger = createLogger('sourceOwnerProcessor');

interface ProcessorOptions extends ReporterOptions<SourceOwner> {
  saveOwner(owner: OwnerDBO): Promise<void>;
}

export function sourceOwnerProcessor(opts: ProcessorOptions) {
  const { abortEarly, saveOwner, reporter } = opts;

  return new WritableStream<SourceOwner>({
    async write(chunk) {
      try {
        logger.debug('Processing source owner...', { chunk });

        await saveOwner({
          id: uuidv4(),
          idpersonne: chunk.idpersonne,
          full_name: chunk.full_name,
          birth_date: chunk.birth_date,
          administrator: null,
          siren: chunk.siren,
          address_dgfip: [chunk.dgfip_address],
          additional_address: null,
          email: null,
          phone: null,
          data_source: 'lovac-2024',
          kind_class: chunk.ownership_type,
          owner_kind_detail: null,
          created_at: new Date(),
          updated_at: new Date()
        });
        reporter.passed(chunk);
      } catch (error) {
        reporter.failed(
          chunk,
          new ReporterError((error as Error).message, chunk)
        );

        if (abortEarly) {
          throw error;
        }
      }
    }
  });
}

export default sourceOwnerProcessor;
