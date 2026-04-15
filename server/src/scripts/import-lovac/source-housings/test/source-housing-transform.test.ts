import { faker } from '@faker-js/faker/locale/fr';
import {
  HousingStatus,
  Occupancy
} from '@zerologementvacant/models';
import { v5 as uuidv5 } from 'uuid';
import { formatHousingRecordApi } from '~/repositories/housingRepository';
import { LOVAC_NAMESPACE } from '~/scripts/import-lovac/infra';
import { genSourceHousing } from '~/scripts/import-lovac/infra/fixtures';
import { createNoopReporter } from '~/scripts/import-lovac/infra/reporters/noop-reporter';
import { EnrichedSourceHousing } from '../source-housing-enricher';
import {
  createHousingTransform,
  HousingChange,
  HousingRecordInsert,
  SourceHousingChange
} from '../source-housing-transform';
import { genHousingApi } from '~/test/testFixtures';

const ADMIN_USER_ID = faker.string.uuid();

describe('createHousingTransform', () => {
  const reporter = createNoopReporter<any>();
  const transform = createHousingTransform({
    reporter,
    adminUserId: ADMIN_USER_ID,
    year: 'lovac-2025'
  });

  describe('housing not in DB (existing.housing === null)', () => {
    it('should produce a create change', () => {
      const source = genSourceHousing();
      const enriched: EnrichedSourceHousing = {
        source,
        existing: { housing: null, events: [], notes: [] }
      };
      const changes = transform(enriched);
      expect(changes).toContainEqual(
        expect.objectContaining<Partial<HousingChange>>({
          type: 'housing',
          kind: 'create'
        })
      );
    });

    it('should set occupancy to VACANT and status to NEVER_CONTACTED', () => {
      const source = genSourceHousing();
      const enriched: EnrichedSourceHousing = {
        source,
        existing: { housing: null, events: [], notes: [] }
      };
      const changes = transform(enriched);
      const housingChange = changes.find(
        (c: SourceHousingChange): c is HousingChange => c.type === 'housing'
      )!;
      expect(housingChange.value).toMatchObject<Partial<HousingRecordInsert>>({
        occupancy: Occupancy.VACANT,
        occupancy_source: Occupancy.VACANT,
        status: HousingStatus.NEVER_CONTACTED,
        data_file_years: ['lovac-2025']
      });
    });

    it('should produce a deterministic id', () => {
      const source = genSourceHousing();
      const enriched: EnrichedSourceHousing = {
        source,
        existing: { housing: null, events: [], notes: [] }
      };
      const [c1, c2] = [transform(enriched), transform(enriched)];
      const id1 = (c1.find((c: SourceHousingChange): c is HousingChange => c.type === 'housing')!).value.id;
      const id2 = (c2.find((c: SourceHousingChange): c is HousingChange => c.type === 'housing')!).value.id;
      expect(id1).toBe(id2);
      expect(id1).toBe(
        uuidv5(source.local_id + ':' + source.geo_code, LOVAC_NAMESPACE)
      );
    });

    it('should add an address change when ban_label is present', () => {
      const source = { ...genSourceHousing(), ban_label: 'some address' };
      const enriched: EnrichedSourceHousing = {
        source,
        existing: { housing: null, events: [], notes: [] }
      };
      const changes = transform(enriched);
      expect(changes.some((c: SourceHousingChange) => c.type === 'address')).toBe(true);
    });

    it('should NOT add an address change when ban_label is absent', () => {
      const source = { ...genSourceHousing(), ban_label: null };
      const enriched: EnrichedSourceHousing = {
        source,
        existing: { housing: null, events: [], notes: [] }
      };
      const changes = transform(enriched);
      expect(changes.some((c: SourceHousingChange) => c.type === 'address')).toBe(false);
    });
  });

  describe('housing in DB (existing.housing !== null)', () => {
    it('should produce an update change with lovac-2025 appended to data_file_years', () => {
      const housing = formatHousingRecordApi({
        ...genHousingApi(),
        dataFileYears: ['lovac-2024']
      });
      const source = {
        ...genSourceHousing(),
        geo_code: housing.geo_code,
        local_id: housing.local_id
      };
      const enriched: EnrichedSourceHousing = {
        source,
        existing: { housing: housing as any, events: [], notes: [] }
      };
      const changes = transform(enriched);
      const housingChange = changes.find(
        (c: SourceHousingChange): c is HousingChange => c.type === 'housing'
      )!;
      expect(housingChange.kind).toBe('update');
      expect(housingChange.value.data_file_years).toContain('lovac-2025');
    });

    describe('non-vacant housing with no user events or notes', () => {
      it('should reset occupancy to VACANT and status to NEVER_CONTACTED', () => {
        const housing = formatHousingRecordApi({
          ...genHousingApi(),
          occupancy: Occupancy.RENT,
          status: HousingStatus.IN_PROGRESS
        });
        const source = {
          ...genSourceHousing(),
          geo_code: housing.geo_code,
          local_id: housing.local_id
        };
        const enriched: EnrichedSourceHousing = {
          source,
          existing: { housing: housing as any, events: [], notes: [] }
        };
        const changes = transform(enriched);
        const housingChange = changes.find(
          (c: SourceHousingChange): c is HousingChange => c.type === 'housing'
        )!;
        expect(housingChange.value).toMatchObject<Partial<HousingRecordInsert>>({
          occupancy: Occupancy.VACANT,
          status: HousingStatus.NEVER_CONTACTED,
          sub_status: null
        });
      });

      it('should produce an occupancy-updated event', () => {
        const housing = formatHousingRecordApi({
          ...genHousingApi(),
          occupancy: Occupancy.RENT,
          status: HousingStatus.IN_PROGRESS
        });
        const source = {
          ...genSourceHousing(),
          geo_code: housing.geo_code,
          local_id: housing.local_id
        };
        const enriched: EnrichedSourceHousing = {
          source,
          existing: { housing: housing as any, events: [], notes: [] }
        };
        const changes = transform(enriched);
        expect(
          changes.some(
            (c: SourceHousingChange) =>
              c.type === 'event' &&
              (c.value as any).type === 'housing:occupancy-updated'
          )
        ).toBe(true);
      });
    });

    describe('non-vacant housing with a user-authored occupancy event', () => {
      it('should NOT reset occupancy', () => {
        const housing = formatHousingRecordApi({
          ...genHousingApi(),
          occupancy: Occupancy.RENT,
          status: HousingStatus.IN_PROGRESS
        });
        // A user event: created_by is NOT the admin user
        const userEvent = {
          id: faker.string.uuid(),
          type: 'housing:occupancy-updated',
          next_old: { occupancy: Occupancy.VACANT },
          next_new: { occupancy: Occupancy.RENT },
          created_by: faker.string.uuid(), // different from ADMIN_USER_ID
          created_at: new Date()
        };
        const source = {
          ...genSourceHousing(),
          geo_code: housing.geo_code,
          local_id: housing.local_id
        };
        const enriched: EnrichedSourceHousing = {
          source,
          existing: { housing: housing as any, events: [userEvent as any], notes: [] }
        };
        const changes = transform(enriched);
        const housingChange = changes.find(
          (c: SourceHousingChange): c is HousingChange => c.type === 'housing'
        )!;
        expect(housingChange.value.occupancy).toBe(Occupancy.RENT);
      });
    });
  });
});
