import { v4 as uuidv4 } from 'uuid';
import { OwnerApi } from '~/models/OwnerApi';
import { OwnerDBO } from '~/repositories/ownerRepository';
import {
  ReporterError,
  ReporterOptions
} from '~/scripts/import-lovac/infra/reporters';
import { EnrichedOwner } from '~/scripts/import-lovac/source-owners/source-owner-enricher';
import { SourceOwner } from '~/scripts/import-lovac/source-owners/source-owner';

interface Change<Value, Type extends string> {
  type: Type;
  kind: 'create' | 'update';
  value: Value;
}

export type OwnerChange = Change<OwnerApi, 'owner'>;

type TransformOptions = ReporterOptions<SourceOwner>;

/**
 * Returns a pure synchronous function mapping EnrichedOwner → OwnerChange.
 * No DB calls — all enrichment is pre-fetched by the enricher step.
 */
export function createOwnerTransform(options: TransformOptions) {
  const { reporter } = options;

  return function transform(enriched: EnrichedOwner): OwnerChange {
    const { source, existing } = enriched;
    try {
      const change: OwnerChange = existing
        ? toUpdate(source, existing)
        : toCreate(source);
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

function toCreate(source: SourceOwner): OwnerChange {
  const now = new Date().toJSON();
  return {
    type: 'owner',
    kind: 'create',
    value: {
      id: uuidv4(),
      idpersonne: source.idpersonne,
      fullName: source.full_name,
      birthDate: source.birth_date?.toJSON() ?? null,
      administrator: null,
      siren: source.siren ?? null,
      rawAddress: source.dgfip_address ? [source.dgfip_address] : null,
      banAddress: null,
      additionalAddress: null,
      email: null,
      phone: null,
      dataSource: 'lovac-2026',
      kind: source.ownership_type,
      entity: source.entity,
      createdAt: now,
      updatedAt: now
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
      fullName: source.full_name,
      birthDate: source.birth_date
        ? source.birth_date.toJSON().substring(0, 'yyyy-mm-dd'.length)
        : existing.birth_date
          ? new Date(existing.birth_date).toJSON()
          : null,
      administrator: existing.administrator ?? null,
      siren: source.siren ?? existing.siren ?? null,
      rawAddress: source.dgfip_address ? [source.dgfip_address] : null,
      banAddress: null,
      additionalAddress: existing.additional_address ?? null,
      email: existing.email ?? null,
      phone: existing.phone ?? null,
      dataSource: existing.data_source ?? undefined,
      kind: source.ownership_type,
      entity: source.entity,
      createdAt: existing.created_at
        ? new Date(existing.created_at).toJSON()
        : null,
      updatedAt: new Date().toJSON()
    }
  };
}
