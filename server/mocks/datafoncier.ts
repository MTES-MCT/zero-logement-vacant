import { constants } from 'http2';
import nock from 'nock';

import config from '../utils/config';
import {
  genDatafoncierHousing,
  genDatafoncierOwner,
} from '../test/testFixtures';
import { DatafoncierHousing } from '../../shared';
import { URLSearchParams } from 'url';
import fp from 'lodash/fp';

function mock() {
  if (!config.datafoncier.enabled) {
    nock(config.datafoncier.api)
      .get(/^\/ff\/locaux\/.+/)
      .reply(async (uri) => {
        const localId = uri.split('/').pop();
        if (!localId) {
          throw new Error(`Could not find a local id in ${uri}`);
        }

        const body: DatafoncierHousing = {
          ...genDatafoncierHousing(),
          idlocal: localId,
        };
        return [constants.HTTP_STATUS_OK, body];
      })
      .persist()
      .get('/ff/proprios')
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
