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
    idpersonnes: string[]
  ): SourceHousingOwner[] {
    return idpersonnes.map((idpersonne, i) => ({
      idpersonne,
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
      [owner.idpersonne as string]
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
      [owner.idpersonne as string]
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
    expect(result.existing.owners[0].idpersonne).toBe(owner.idpersonne);
    expect(result.existing.existingHousingOwners).toStrictEqual([]);
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
        [existingOwner.idpersonne as string, newSourceOwner.idpersonne as string]
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
        [newSourceOwner.idpersonne as string] // only the NEW owner in source
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
