import housingRepository, {
  filteredQuery,
  housingTable,
} from '../housingRepository';
import db from '../db';
import {
  EnergyConsumptionGradesApi,
  OccupancyKindApi,
} from '../../models/HousingApi';
import { Establishment1 } from '../../../database/seeds/test/001-establishments';
import { Campaign1 } from '../../../database/seeds/test/006-campaigns';

describe('Housing repository', () => {
  describe('find', () => {
    it('should sort by id by default', async () => {
      const actual = await housingRepository.find({
        filters: {},
      });

      expect(actual).toBeSortedBy('id');
    });
  });

  describe('filteredQuery', () => {
    it('should keep only long-term vacant housing by default', async () => {
      const actual = await db(housingTable).modify(filteredQuery({}));

      expect(actual).toSatisfyAll(
        (housing) => housing.occupancy === OccupancyKindApi.Vacant
      );
      expect(actual).toSatisfyAll(
        (housing) => housing.vacancy_start_year <= 2022
      );
    });

    it('should filter by occupancy otherwise', async () => {
      const occupancies = [OccupancyKindApi.Rent, OccupancyKindApi.Dependency];

      const actual = await db(housingTable).modify(
        filteredQuery({
          occupancies,
        })
      );

      expect(actual).toSatisfyAll((housing) =>
        occupancies.includes(housing.occupancy)
      );
    });

    it('should filter by energy consumption', async () => {
      const consumptions = [EnergyConsumptionGradesApi.A];

      const actual = await db(housingTable).modify(
        filteredQuery({
          energyConsumption: consumptions,
        })
      );

      expect(actual).toSatisfyAll((housing) =>
        consumptions.includes(housing.energy_consumption)
      );
    });

    it('should filter by establishment', async () => {
      const establishments = [Establishment1.id];

      const actual = await db(housingTable)
        .select('e.id as establishment_id')
        .modify(
          filteredQuery({
            establishmentIds: establishments,
          })
        );

      expect(actual).toSatisfyAll((housing) =>
        establishments.includes(housing.establishment_id)
      );
    });

    it.skip('should filter by campaign', async () => {
      const campaigns = [Campaign1.id];

      const actual = await db(housingTable).modify(
        filteredQuery({
          campaignIds: campaigns,
        })
      );

      expect(actual).toSatisfyAll((housing) => campaigns.includes(housing));
    });
  });
});
