import { v5 as uuidv5 } from 'uuid';
import { OwnerDBO, OwnerRecordDBO } from '~/repositories/ownerRepository';
import {
  LOVAC_NAMESPACE,
  ReporterError,
  ReporterOptions
} from '~/scripts/import-lovac/infra';
import { EnrichedOwner } from '~/scripts/import-lovac/source-owners/source-owner-enricher';
import { SourceOwner } from '~/scripts/import-lovac/source-owners/source-owner';

interface Change<Value, Type extends string> {
  type: Type;
  kind: 'create' | 'update';
  value: Value;
}

export type OwnerChange = Change<OwnerRecordDBO, 'owner'>;

type TransformOptions = ReporterOptions<SourceOwner> & { year?: string };

/**
 * Returns a pure synchronous function mapping EnrichedOwner → OwnerChange.
 * No DB calls — all enrichment is pre-fetched by the enricher step.
 */
export function createOwnerTransform(options: TransformOptions) {
  const { reporter, year } = options;

  return function transform(enriched: EnrichedOwner): OwnerChange {
    const { source, existing } = enriched;
    try {
      const change: OwnerChange = existing
        ? toUpdate(source, existing)
        : toCreate(source, year);
      reporter.passed(source);
      return change;
    } catch (error) {
      reporter.failed(
        source,
        new ReporterError((error as Error).message, source)
      );
      throw error;
    }
  };
}

function toCreate(source: SourceOwner, year?: string): OwnerChange {
  const now = new Date();
  return {
    type: 'owner',
    kind: 'create',
    value: {
      id: uuidv5(source.idpersonne, LOVAC_NAMESPACE),
      idpersonne: source.idpersonne,
      full_name: source.full_name,
      birth_date: source.birth_date ?? null,
      administrator: null,
      siren: source.siren ?? null,
      address_dgfip: source.dgfip_address ? [source.dgfip_address] : null,
      additional_address: null,
      email: null,
      phone: null,
      data_source: year ?? 'lovac',
      kind_class: source.ownership_type,
      entity: source.entity,
      created_at: now,
      updated_at: now
    }
  };
}

function toUpdate(source: SourceOwner, existing: OwnerDBO): OwnerChange {
  return {
    type: 'owner',
    kind: 'update',
    value: {
      id: existing.id,
      idpersonne: source.idpersonne,
      full_name: source.full_name,
      birth_date: source.birth_date ?? existing.birth_date ?? null,
      administrator: existing.administrator ?? null,
      siren: source.siren ?? existing.siren ?? null,
      address_dgfip: source.dgfip_address ? [source.dgfip_address] : null,
      additional_address: existing.additional_address ?? null,
      email: existing.email ?? null,
      phone: existing.phone ?? null,
      data_source: existing.data_source ?? null,
      kind_class: source.ownership_type,
      entity: source.entity,
      created_at: existing.created_at ?? null,
      updated_at: new Date()
    }
  };
}
