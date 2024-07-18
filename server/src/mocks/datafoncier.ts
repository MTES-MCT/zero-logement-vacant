import { constants } from 'http2';
import fp from 'lodash/fp';
import nock from 'nock';
import { URLSearchParams } from 'url';

import { DatafoncierHousing } from '@zerologementvacant/shared';
import config from '~/infra/config';
import { DatafoncierResultDTO } from '~/models/DatafoncierResultDTO';
import { DatafoncierOwner } from '~/scripts/shared';
import {
  genDatafoncierHousing,
  genDatafoncierOwner
} from '~/test/testFixtures';

function mock() {
  if (!config.datafoncier.enabled) {
    const housingCache = new Map<string, DatafoncierHousing>();

    nock(config.datafoncier.api)
      .get(/^\/ff\/locaux\/.+/)
      .reply(async (uri) => {
        const localId = uri.split('/').pop();
        if (!localId) {
          throw new Error(`Could not find a local id in ${uri}`);
        }

        if (housingCache.has(localId)) {
          return [constants.HTTP_STATUS_OK, housingCache.get(localId)];
        }

        const geoCode = localId.substring(0, 5);
        const body: DatafoncierHousing = {
          ...genDatafoncierHousing(),
          idcom: geoCode,
          idlocal: localId,
        };
        housingCache.set(localId, body);
        return [constants.HTTP_STATUS_OK, body];
      })
      .persist()
      .get('/ff/proprios')
      .query(true)
      .reply(async (uri) => {
        const query = new URLSearchParams(uri);
        const owners = new Array(fp.random(1, 6))
          .fill(0)
          .map(() => genDatafoncierOwner(query.get('idprocpte') ?? undefined));

        const body: DatafoncierResultDTO<DatafoncierOwner> = {
          count: owners.length,
          previous: null,
          next: null,
          results: owners,
        };
        return [constants.HTTP_STATUS_OK, body];
      })
      .persist();
  }
}

export default mock;
