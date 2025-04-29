import { map } from '@zerologementvacant/utils/node';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '~/infra/logger';
import { OwnerApi } from '~/models/OwnerApi';
import { OwnerDBO } from '~/repositories/ownerRepository';
import {
  ReporterError,
  ReporterOptions
} from '~/scripts/import-lovac/infra/reporters';

import { SourceOwner } from '~/scripts/import-lovac/source-owners/source-owner';

const logger = createLogger('sourceOwnerProcessor');

interface ProcessorOptions extends ReporterOptions<SourceOwner> {
  ownerRepository: {
    findOne(opts: { idpersonne: string }): Promise<OwnerDBO | null>;
  };
}

interface Change<Value, Type extends string> {
  type: Type;
  kind: 'create' | 'update' | 'delete';
  value: Value;
}

export type OwnerChange = Change<OwnerApi, 'owner'>;

export function sourceOwnerProcessor(opts: ProcessorOptions) {
  const { abortEarly, ownerRepository, reporter } = opts;

  return map<SourceOwner, OwnerChange | null>(async (sourceOwner) => {
    try {
      logger.debug('Processing source owner...', { sourceOwner });

      const existingOwner = await ownerRepository.findOne({
        idpersonne: sourceOwner.idpersonne
      });
      if (!existingOwner) {
        const now = new Date().toJSON();
        const change: OwnerChange = {
          type: 'owner',
          kind: 'create',
          value: {
            id: uuidv4(),
            idpersonne: sourceOwner.idpersonne,
            fullName: sourceOwner.full_name,
            birthDate: sourceOwner.birth_date?.toJSON() ?? null,
            administrator: undefined,
            siren: sourceOwner.siren ?? undefined,
            rawAddress: sourceOwner.dgfip_address
              ? [sourceOwner.dgfip_address]
              : null,
            additionalAddress: undefined,
            email: undefined,
            phone: undefined,
            dataSource: 'lovac-2025',
            kind: sourceOwner.ownership_type,
            kindDetail: undefined,
            entity: sourceOwner.entity,
            createdAt: now,
            updatedAt: now
          }
        };
        reporter.passed(sourceOwner);
        return change;
      }

      const change: OwnerChange = {
        type: 'owner',
        kind: 'update',
        value: {
          id: existingOwner.id,
          idpersonne: sourceOwner.idpersonne,
          fullName: sourceOwner.full_name,
          birthDate: sourceOwner.birth_date
            ? sourceOwner.birth_date.toJSON().substring(0, 'yyyy-mm-dd'.length)
            : existingOwner.birth_date
              ? new Date(existingOwner.birth_date).toJSON()
              : null,
          administrator: existingOwner.administrator ?? undefined,
          siren: sourceOwner.siren ?? existingOwner.siren ?? undefined,
          rawAddress: sourceOwner.dgfip_address
            ? [sourceOwner.dgfip_address]
            : null,
          additionalAddress: existingOwner.additional_address ?? undefined,
          email: existingOwner.email ?? undefined,
          phone: existingOwner.phone ?? undefined,
          dataSource: existingOwner.data_source ?? undefined,
          kind: sourceOwner.ownership_type,
          kindDetail: existingOwner.owner_kind_detail ?? undefined,
          entity: sourceOwner.entity,
          createdAt: existingOwner.created_at
            ? new Date(existingOwner.created_at).toJSON()
            : undefined,
          updatedAt: new Date().toJSON()
        }
      };
      reporter.passed(sourceOwner);
      return change;
    } catch (error) {
      reporter.failed(
        sourceOwner,
        new ReporterError((error as Error).message, sourceOwner)
      );

      if (abortEarly) {
        throw error;
      }

      return null;
    }
  });
}

export default sourceOwnerProcessor;
