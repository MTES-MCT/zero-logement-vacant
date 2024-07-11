import { WritableStream } from 'node:stream/web';
import { v4 as uuidv4 } from 'uuid';

import { SourceOwner } from '~/scripts/import-lovac/source-owners/source-owner';
import { ReporterOptions } from '~/scripts/import-lovac/infra/reporters';
import { createLogger } from '~/infra/logger';
import { OwnerDBO } from '~/repositories/ownerRepository';

const logger = createLogger('sourceOwnerProcessor');

interface ProcessorOptions extends ReporterOptions<SourceOwner> {
  saveOwner(owner: OwnerDBO): Promise<void>;
}

export function sourceOwnerProcessor(opts: ProcessorOptions) {
  const { saveOwner, reporter } = opts;

  return new WritableStream<SourceOwner>({
    async write(chunk, controller) {
      try {
        logger.debug('Processing source owner...', { chunk });

        await saveOwner({
          id: uuidv4(),
          idpersonne: chunk.idpersonne,
          full_name: chunk.full_name,
          birth_date: chunk.birth_date,
          administrator: chunk.administrator,
          siren: chunk.siren,
          dgfip_address: [chunk.dgfip_address],
          additional_address: null,
          email: null,
          phone: null,
          data_source: chunk.data_source,
          kind_class: chunk.kind_class,
          owner_kind_detail: null,
          created_at: new Date(),
          updated_at: new Date()
        });
        reporter.passed(chunk);
      } catch (error) {
        controller.error(error);
      }
    }
  });
}

export default sourceOwnerProcessor;
