import { TransformStream } from 'node:stream/web';
import { OwnerDBO, Owners } from '~/repositories/ownerRepository';
import { Enriched, enrichWith } from '~/scripts/import-lovac/infra/enrich';
import { SourceOwner } from '~/scripts/import-lovac/source-owners/source-owner';

export type EnrichedOwner = Enriched<SourceOwner, OwnerDBO>;

export function createOwnerEnricher(): TransformStream<SourceOwner, EnrichedOwner> {
  return enrichWith<SourceOwner, OwnerDBO>({
    async fetch(sources) {
      const idpersonnes = sources.map((s) => s.idpersonne);
      return Owners().whereIn('idpersonne', idpersonnes);
    },
    match: (source, owner) => owner.idpersonne === source.idpersonne
  });
}
