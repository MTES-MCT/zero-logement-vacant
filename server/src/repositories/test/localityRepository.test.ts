import localityRepository, {
  formatLocalityApi,
  Localities
} from '../localityRepository';
import { genEstablishmentApi, genLocalityApi } from '~/test/testFixtures';
import {
  Establishments,
  formatEstablishmentApi
} from '../establishmentRepository';

describe('Locality repository', () => {
  describe('find', () => {
    describe('geoCodes filter', () => {
      const establishment = genEstablishmentApi();
      const locality1 = genLocalityApi();
      const locality2 = genLocalityApi();

      beforeAll(async () => {
        await Establishments().insert(formatEstablishmentApi(establishment));
        await Localities().insert([
          formatLocalityApi(locality1),
          formatLocalityApi(locality2)
        ]);
      });

      it('should return no localities when geoCodes is empty', async () => {
        const result = await localityRepository.find({
          filters: { geoCodes: [] }
        });

        expect(result).toBeArrayOfSize(0);
      });

      it('should return only localities matching geoCodes', async () => {
        const result = await localityRepository.find({
          filters: { geoCodes: [locality1.geoCode] }
        });

        const geoCodes = result.map((locality) => locality.geoCode);
        expect(geoCodes).toContain(locality1.geoCode);
        expect(geoCodes).not.toContain(locality2.geoCode);
      });

      it('should return all localities when geoCodes is undefined', async () => {
        const result = await localityRepository.find({ filters: {} });

        const geoCodes = result.map((locality) => locality.geoCode);
        expect(geoCodes).toContain(locality1.geoCode);
        expect(geoCodes).toContain(locality2.geoCode);
      });
    });
  });
});
