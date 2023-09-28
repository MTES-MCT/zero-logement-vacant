import housingRepository from '../housingRepository';
import {
  Establishment1,
  Establishment2,
} from '../../../database/seeds/test/001-establishments';
import { Housing1 } from '../../../database/seeds/test/005-housing';

describe('Housing repository', () => {
  describe('find', () => {
    it('should sort by geo code and id by default', async () => {
      const actual = await housingRepository.find({
        filters: {},
      });

      expect(actual).toBeSortedBy('geoCode');
      expect(actual).toBeSortedBy('id');
    });

    it('should filter by housing ids', async () => {
      const actual = await housingRepository.find({
        filters: {
          establishmentIds: [Establishment1.id],
          housingIds: [Housing1.id],
        },
      });

      expect(actual).toBeArrayOfSize(1);
      expect(actual[0]).toMatchObject({
        id: Housing1.id,
        geoCode: Housing1.geoCode,
      });
    });

    it('should filter by establishment', async () => {
      const establishment = Establishment2;

      const actual = await housingRepository.find({
        filters: {
          establishmentIds: [establishment.id],
        },
      });

      expect(actual).toSatisfyAll(
        (housing) => housing.establishmentId === establishment.id
      );
    });
  });

  describe('get', () => {
    it('should return the housing if it exists', async () => {
      const actual = await housingRepository.get(
        Housing1.id,
        Establishment1.id
      );

      expect(actual).toBeDefined();
    });

    it('should return null otherwise', async () => {
      const actual = await housingRepository.get(
        Housing1.id,
        Establishment2.id
      );

      expect(actual).toBeNull();
    });
  });
});
