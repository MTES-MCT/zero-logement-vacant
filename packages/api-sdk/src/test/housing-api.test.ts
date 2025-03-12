import { Occupancy } from '@zerologementvacant/models';
import {
  genHousingDTO,
  genOwnerDTO
} from '@zerologementvacant/models/fixtures';
import axios from 'axios';
import nock from 'nock';
import { constants } from 'node:http2';
import qs from 'qs';
import { createHousingAPI } from '../housing-api';

describe('Housing API', () => {
  const host = 'https://api.zerologementvacant.beta.gouv.fr';
  const http = axios.create({
    baseURL: host,
    paramsSerializer: (query) => qs.stringify(query, { arrayFormat: 'comma' })
  });

  describe('find', () => {
    it('should return a list of housing', async () => {
      const owner = genOwnerDTO();
      const housings = Array.from({ length: 3 }, () => genHousingDTO(owner));
      nock(host)
        .get('/housing')
        .query(
          `occupancies=${Occupancy.VACANT}&dataFileYearsIncluded=lovac-2023,lovac-2024`
        )
        .reply(constants.HTTP_STATUS_OK, {
          entities: housings
        });

      const api = createHousingAPI(http);
      const actual = await api.find({
        filters: {
          occupancies: [Occupancy.VACANT],
          dataFileYearsIncluded: ['lovac-2023', 'lovac-2024']
        }
      });

      expect(actual).toIncludeAllPartialMembers(
        housings.map((housing) => ({ id: housing.id }))
      );
    });
  });
});
