import { faker } from '@faker-js/faker/locale/fr';
import {
  ActiveOwnerRank,
  isActiveOwnerRank,
  isPreviousOwnerRank
} from '@zerologementvacant/models';
import {
  formatHousingOwnerApi,
  HousingOwnerDBO
} from '~/repositories/housingOwnerRepository';
import { formatHousingRecordApi } from '~/repositories/housingRepository';
import { formatOwnerApi } from '~/repositories/ownerRepository';
import { createNoopReporter } from '~/scripts/import-lovac/infra/reporters/noop-reporter';
import { EnrichedSourceHousingOwners } from '../source-housing-owner-enricher';
import {
  createHousingOwnerTransform,
  HousingOwnerChange,
  HousingOwnersChange
} from '../source-housing-owner-transform';
import {
  genHousingApi,
  genHousingOwnerApi,
  genOwnerApi
} from '~/test/testFixtures';
import { SourceHousingOwner } from '../source-housing-owner';

const ADMIN_USER_ID = faker.string.uuid();

function genValidIdpersonne(): string {
  return (
    faker.string.numeric(2) +
    faker.string.alphanumeric({ length: 6, casing: 'upper' })
  );
}

function makeSourceOwner(
  housingGeoCode: string,
  housingLocalId: string,
  idpersonne: string,
  rank: ActiveOwnerRank
): SourceHousingOwner {
  return {
    idpersonne,
    idprocpte: faker.string.alphanumeric(8),
    idprodroit: faker.string.alphanumeric(8),
    rank,
    geo_code: housingGeoCode,
    local_id: housingLocalId,
    locprop_source: 1,
    property_right: 'autre' as const
  };
}

describe('createHousingOwnerTransform', () => {
  const reporter = createNoopReporter<any>();
  const transform = createHousingOwnerTransform({
    reporter,
    adminUserId: ADMIN_USER_ID,
    year: 'lovac-2025'
  });

  describe('missing housing', () => {
    it('should call reporter.failed and return []', () => {
      const spy = vi.spyOn(reporter, 'failed');
      const source: SourceHousingOwner[] = [
        makeSourceOwner('75001', 'LOCAL001', genValidIdpersonne(), 1)
      ];
      const enriched: EnrichedSourceHousingOwners = {
        source,
        existing: { housing: null, owners: [], existingHousingOwners: [] }
      };
      const changes = transform(enriched);
      expect(changes).toStrictEqual([]);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('missing owners', () => {
    it('should call reporter.failed when a source owner is not in existing.owners', () => {
      const housing = formatHousingRecordApi(genHousingApi());
      const spy = vi.spyOn(reporter, 'failed');
      const source: SourceHousingOwner[] = [
        makeSourceOwner(housing.geo_code, housing.local_id, genValidIdpersonne(), 1)
      ];
      const enriched: EnrichedSourceHousingOwners = {
        source,
        existing: { housing: housing as any, owners: [], existingHousingOwners: [] }
      };
      const changes = transform(enriched);
      expect(changes).toStrictEqual([]);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('new housing owners (no existing)', () => {
    const housing = formatHousingRecordApi(genHousingApi());
    const owner = formatOwnerApi({ ...genOwnerApi(), idpersonne: genValidIdpersonne() });
    const source = [
      makeSourceOwner(housing.geo_code, housing.local_id, owner.idpersonne!, 1)
    ];
    const enriched: EnrichedSourceHousingOwners = {
      source,
      existing: {
        housing: housing as any,
        owners: [owner as any],
        existingHousingOwners: []
      }
    };

    it('should produce a housingOwners replace change with the new owner as active', () => {
      const changes = transform(enriched);
      const ownerChange = changes.find(
        (c: HousingOwnerChange): c is HousingOwnersChange => c.type === 'housingOwners'
      )!;
      expect(ownerChange.kind).toBe('replace');
      const activeOwners = ownerChange.value.filter((ho: HousingOwnerDBO) =>
        isActiveOwnerRank(ho.rank)
      );
      expect(activeOwners).toHaveLength(1);
      expect(activeOwners[0].owner_id).toBe(owner.id);
      expect(activeOwners[0].housing_id).toBe(housing.id);
      expect(activeOwners[0].end_date).toBeNull();
    });
  });

  describe('replacing existing housing owners', () => {
    const housing = formatHousingRecordApi(genHousingApi());
    const existingOwner = formatOwnerApi({ ...genOwnerApi(), idpersonne: genValidIdpersonne() });
    const newOwner = formatOwnerApi({ ...genOwnerApi(), idpersonne: genValidIdpersonne() });
    const existingHousingOwner: HousingOwnerDBO = formatHousingOwnerApi({
      ...genHousingOwnerApi(genHousingApi(), genOwnerApi()),
      ownerId: existingOwner.id,
      housingId: housing.id,
      housingGeoCode: housing.geo_code,
      rank: 1
    });
    const source = [
      makeSourceOwner(housing.geo_code, housing.local_id, newOwner.idpersonne!, 1)
    ];
    const enriched: EnrichedSourceHousingOwners = {
      source,
      existing: {
        housing: housing as any,
        owners: [existingOwner as any, newOwner as any],
        existingHousingOwners: [existingHousingOwner]
      }
    };

    it('should archive the old owner with PREVIOUS_OWNER_RANK', () => {
      const changes = transform(enriched);
      const ownerChange = changes.find(
        (c: HousingOwnerChange): c is HousingOwnersChange => c.type === 'housingOwners'
      )!;
      const archivedOwner = ownerChange.value.find(
        (ho: HousingOwnerDBO) => ho.owner_id === existingOwner.id
      );
      expect(archivedOwner).toBeDefined();
      expect(isPreviousOwnerRank(archivedOwner!.rank)).toBe(true);
      expect(archivedOwner!.end_date).toBeDefined();
    });

    it('should produce an owner-attached event for the new owner', () => {
      const changes = transform(enriched);
      const eventChange = changes.find(
        (c: HousingOwnerChange) =>
          c.type === 'event' &&
          (c.value as any).type === 'housing:owner-attached'
      );
      expect(eventChange).toBeDefined();
    });

    it('should produce an owner-detached event for the removed owner', () => {
      const changes = transform(enriched);
      const eventChange = changes.find(
        (c: HousingOwnerChange) =>
          c.type === 'event' &&
          (c.value as any).type === 'housing:owner-detached'
      );
      expect(eventChange).toBeDefined();
    });
  });
});
