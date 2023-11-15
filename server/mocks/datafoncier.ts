import { constants } from 'http2';
import fp from 'lodash/fp';
import nock from 'nock';
import { URLSearchParams } from 'url';

import config from '../utils/config';
import {
  genDatafoncierHousing,
  genDatafoncierOwner,
} from '../test/testFixtures';
import { DatafoncierHousing } from '../../shared';

function mock() {
  if (!config.datafoncier.enabled) {
    nock(config.datafoncier.api)
      .get(/^\/ff\/locaux\/.+/)
      .reply(async (uri) => {
        const localId = uri.split('/').pop();
        if (!localId) {
          throw new Error(`Could not find a local id in ${uri}`);
        }

        const geoCode = localId.substring(0, 5);
        const body: DatafoncierHousing = {
          ...genDatafoncierHousing(),
          idcom: geoCode,
          idlocal: localId,
        };
        return [constants.HTTP_STATUS_OK, body];
      })
      .persist()
      .get('/ff/proprios')
      .query(true)
      .reply(async (uri) => {
        const query = new URLSearchParams(uri);
        const datafoncierOwners = new Array(fp.random(1, 6))
          .fill(0)
          .map(() => genDatafoncierOwner(query.get('idprocpte')));

        return [constants.HTTP_STATUS_OK, datafoncierOwners];
      })
      .persist();
  }
}

export default mock;
