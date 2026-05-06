import { TransformStream } from 'node:stream/web';
import {
  HousingOwnerDBO,
  HousingOwners
} from '~/repositories/housingOwnerRepository';
import { Housing, HousingRecordDBO } from '~/repositories/housingRepository';
import { OwnerDBO, Owners } from '~/repositories/ownerRepository';
import { SourceHousingOwner } from './source-housing-owner';

const CHUNK_SIZE = 500;

interface HousingOwnerEnrichment {
  housing: HousingRecordDBO | null;
  owners: ReadonlyArray<OwnerDBO>;
  existingHousingOwners: ReadonlyArray<HousingOwnerDBO>;
}

export type EnrichedSourceHousingOwners = {
  source: ReadonlyArray<SourceHousingOwner>;
  existing: HousingOwnerEnrichment;
};

export function createSourceHousingOwnerEnricher(): TransformStream<
  ReadonlyArray<SourceHousingOwner>,
  EnrichedSourceHousingOwners
> {
  const buffer: ReadonlyArray<SourceHousingOwner>[] = [];

  async function flushBuffer(
    controller: TransformStreamDefaultController<EnrichedSourceHousingOwners>
  ): Promise<void> {
    if (buffer.length === 0) return;
    const chunk = buffer.splice(0);

    const housingKeys = chunk.map((group) => [
      group[0].geo_code,
      group[0].local_id
    ]);

    const housings = (await Housing().whereIn(
      ['geo_code', 'local_id'],
      housingKeys
    )) as HousingRecordDBO[];

    const housingByLocalKey = new Map(
      housings.map((h) => [`${h.geo_code}:${h.local_id}`, h])
    );

    const housingPkPairs = housings.map((h) => [h.geo_code, h.id]);
    const existingHousingOwners: HousingOwnerDBO[] =
      housingPkPairs.length === 0
        ? []
        : await HousingOwners().whereIn(
            ['housing_geo_code', 'housing_id'],
            housingPkPairs
          );

    const existingByHousingPk = new Map<string, HousingOwnerDBO[]>();
    for (const ho of existingHousingOwners) {
      const key = `${ho.housing_geo_code}:${ho.housing_id}`;
      const list = existingByHousingPk.get(key);
      if (list) {
        list.push(ho);
      } else {
        existingByHousingPk.set(key, [ho]);
      }
    }

    const sourceOwnerIds = chunk.flatMap((group) =>
      group.map((s) => s.owner_uid)
    );
    const existingOwnerIds = existingHousingOwners.map((ho) => ho.owner_id);
    const allOwnerIds = [...new Set([...sourceOwnerIds, ...existingOwnerIds])];
    const owners: OwnerDBO[] =
      allOwnerIds.length === 0
        ? []
        : await Owners().whereIn('id', allOwnerIds);
    const ownersById = new Map(owners.map((o) => [o.id, o]));

    for (const group of chunk) {
      const localKey = `${group[0].geo_code}:${group[0].local_id}`;
      const housing = housingByLocalKey.get(localKey) ?? null;

      if (!housing) {
        controller.enqueue({
          source: group,
          existing: { housing: null, owners: [], existingHousingOwners: [] }
        });
        continue;
      }

      const housingPkKey = `${housing.geo_code}:${housing.id}`;
      const existing = existingByHousingPk.get(housingPkKey) ?? [];

      const groupOwnerIds = new Set<string>([
        ...group.map((s) => s.owner_uid),
        ...existing.map((ho) => ho.owner_id)
      ]);
      const groupOwners: OwnerDBO[] = [];
      for (const id of groupOwnerIds) {
        const owner = ownersById.get(id);
        if (owner) groupOwners.push(owner);
      }

      controller.enqueue({
        source: group,
        existing: {
          housing,
          owners: groupOwners,
          existingHousingOwners: existing
        }
      });
    }
  }

  return new TransformStream<
    ReadonlyArray<SourceHousingOwner>,
    EnrichedSourceHousingOwners
  >({
    async transform(group, controller) {
      buffer.push(group);
      if (buffer.length >= CHUNK_SIZE) {
        await flushBuffer(controller);
      }
    },
    async flush(controller) {
      await flushBuffer(controller);
    }
  });
}
