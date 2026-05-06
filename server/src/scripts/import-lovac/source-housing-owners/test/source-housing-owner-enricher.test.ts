import { toArray } from '@zerologementvacant/utils/node';
import { faker } from '@faker-js/faker/locale/fr';
import { ACTIVE_OWNER_RANKS, ActiveOwnerRank } from '@zerologementvacant/models';
import { ReadableStream } from 'node:stream/web';
import {
  formatHousingOwnerApi,
  HousingOwnerDBO,
  HousingOwners
} from '~/repositories/housingOwnerRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import {
  formatOwnerApi,
  OwnerDBO,
  Owners
} from '~/repositories/ownerRepository';
import { createSourceHousingOwnerEnricher } from '../source-housing-owner-enricher';
import {
  genHousingApi,
  genHousingOwnerApi,
  genOwnerApi
} from '~/test/testFixtures';
import { SourceHousingOwner } from '../source-housing-owner';
import { EnrichedSourceHousingOwners } from '../source-housing-owner-enricher';

function genValidIdpersonne(): string {
  return (
    faker.string.numeric(2) +
    faker.string.alphanumeric({ length: 6, casing: 'upper' })
  );
}

describe('createSourceHousingOwnerEnricher', () => {
  const housing = genHousingApi();
  const owner = { ...genOwnerApi(), idpersonne: genValidIdpersonne() };

  beforeAll(async () => {
    await Housing().insert(formatHousingRecordApi(housing));
    await Owners().insert(formatOwnerApi(owner));
  });

  function makeGroup(
    housingOverride: { geo_code: string; local_id: string },
    ownerIds: string[]
  ): SourceHousingOwner[] {
    return ownerIds.map((ownerUid, i) => ({
      owner_uid: ownerUid,
      idpersonne: faker.string.alphanumeric(8),
      idprocpte: faker.string.alphanumeric(11),
      idprodroit: faker.string.alphanumeric(13),
      rank: ((i % ACTIVE_OWNER_RANKS.length) + 1) as ActiveOwnerRank,
      geo_code: housingOverride.geo_code,
      local_id: housingOverride.local_id,
      locprop_source: 1,
      property_right: 'autre' as const
    }));
  }

  it('should set existing.housing to null when housing is not found', async () => {
    const group = makeGroup(
      { geo_code: '99000', local_id: 'UNKNOWN00000' },
      [owner.id]
    );
    const [result] = (await toArray(
      ReadableStream.from([group]).pipeThrough(
        createSourceHousingOwnerEnricher()
      )
    )) as EnrichedSourceHousingOwners[];
    expect(result.existing.housing).toBeNull();
    expect(result.existing.existingHousingOwners).toStrictEqual([]);
  });

  it('should populate housing and owners when found', async () => {
    const group = makeGroup(
      { geo_code: housing.geoCode, local_id: housing.localId },
      [owner.id]
    );
    const [result] = (await toArray(
      ReadableStream.from([group]).pipeThrough(
        createSourceHousingOwnerEnricher()
      )
    )) as EnrichedSourceHousingOwners[];
    expect(result.existing.housing).toMatchObject({
      id: housing.id,
      geo_code: housing.geoCode
    });
    expect(result.existing.owners).toHaveLength(1);
    expect(result.existing.owners[0].id).toBe(owner.id);
    expect(result.existing.existingHousingOwners).toStrictEqual([]);
  });

  describe('batching across multiple groups', () => {
    const housingA = genHousingApi();
    const housingB = genHousingApi();
    const ownerA = { ...genOwnerApi(), idpersonne: genValidIdpersonne() };
    const ownerB = { ...genOwnerApi(), idpersonne: genValidIdpersonne() };

    beforeAll(async () => {
      await Housing().insert(
        [housingA, housingB].map(formatHousingRecordApi)
      );
      await Owners().insert([ownerA, ownerB].map(formatOwnerApi));
    });

    it('should enrich multiple groups in one pass and preserve input order', async () => {
      const groupA = makeGroup(
        { geo_code: housingA.geoCode, local_id: housingA.localId },
        [ownerA.id]
      );
      const groupB = makeGroup(
        { geo_code: housingB.geoCode, local_id: housingB.localId },
        [ownerB.id]
      );
      const missingGroup = makeGroup(
        { geo_code: '99000', local_id: 'MISSING00000' },
        [ownerA.id]
      );

      const results = (await toArray(
        ReadableStream.from([groupA, missingGroup, groupB]).pipeThrough(
          createSourceHousingOwnerEnricher()
        )
      )) as EnrichedSourceHousingOwners[];

      expect(results).toHaveLength(3);
      expect(results[0].existing.housing?.id).toBe(housingA.id);
      expect(results[0].existing.owners.map((o) => o.id)).toEqual([ownerA.id]);
      expect(results[1].existing.housing).toBeNull();
      expect(results[1].existing.owners).toStrictEqual([]);
      expect(results[2].existing.housing?.id).toBe(housingB.id);
      expect(results[2].existing.owners.map((o) => o.id)).toEqual([ownerB.id]);
    });
  });

  describe('with existing housing owners', () => {
    const housingWithOwners = genHousingApi();
    const existingOwner = { ...genOwnerApi(), idpersonne: genValidIdpersonne() };
    const newSourceOwner = { ...genOwnerApi(), idpersonne: genValidIdpersonne() };
    let existingHousingOwner: HousingOwnerDBO;

    beforeAll(async () => {
      await Housing().insert(formatHousingRecordApi(housingWithOwners));
      await Owners().insert(
        [existingOwner, newSourceOwner].map(formatOwnerApi)
      );
      const housingOwnerApi = {
        ...genHousingOwnerApi(housingWithOwners, existingOwner),
        rank: 1 as ActiveOwnerRank
      };
      existingHousingOwner = formatHousingOwnerApi(housingOwnerApi);
      await HousingOwners().insert(existingHousingOwner);
    });

    it('should populate existingHousingOwners', async () => {
      const group = makeGroup(
        { geo_code: housingWithOwners.geoCode, local_id: housingWithOwners.localId },
        [existingOwner.id, newSourceOwner.id]
      );
      const [result] = (await toArray(
        ReadableStream.from([group]).pipeThrough(
          createSourceHousingOwnerEnricher()
        )
      )) as EnrichedSourceHousingOwners[];
      expect(result.existing.existingHousingOwners).toHaveLength(1);
      expect(result.existing.existingHousingOwners[0].owner_id).toBe(
        existingOwner.id
      );
    });

    it('should fetch owners for both source idpersonnes and existing housing owners', async () => {
      const group = makeGroup(
        { geo_code: housingWithOwners.geoCode, local_id: housingWithOwners.localId },
        [newSourceOwner.id] // only the NEW owner in source
      );
      const [result] = (await toArray(
        ReadableStream.from([group]).pipeThrough(
          createSourceHousingOwnerEnricher()
        )
      )) as EnrichedSourceHousingOwners[];
      // Should include both the source owner AND the existing housing owner's owner record
      const ownerIds = result.existing.owners.map((o: OwnerDBO) => o.id);
      expect(ownerIds).toContain(newSourceOwner.id);
      expect(ownerIds).toContain(existingOwner.id);
    });
  });
});
