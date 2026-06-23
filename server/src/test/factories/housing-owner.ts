import { faker } from '@faker-js/faker/locale/fr';
import {
  ACTIVE_OWNER_RANKS,
  PROPERTY_RIGHT_VALUES,
  RELATIVE_LOCATION_VALUES
} from '@zerologementvacant/models';
import { Factory } from 'fishery';

import { HousingRecordApi } from '~/models/HousingApi';
import { HousingOwnerApi } from '~/models/HousingOwnerApi';
import { OwnerApi } from '~/models/OwnerApi';

import type { PersistenceAdapter } from './persistence-adapter';

export interface HousingOwnerFactoryParams {
  housing: Pick<HousingRecordApi, 'id' | 'geoCode'>;
  owner: OwnerApi;
}

/**
 * Builds a {@link HousingOwnerApi} linking the given owner to the given
 * housing. Both are required to construct the factory.
 */
export function createHousingOwnerFactory(
  adapter: PersistenceAdapter,
  { housing, owner }: HousingOwnerFactoryParams
) {
  return Factory.define<HousingOwnerApi>(() => ({
    ...owner,
    ownerId: owner.id,
    housingGeoCode: housing.geoCode,
    housingId: housing.id,
    rank: faker.helpers.arrayElement(ACTIVE_OWNER_RANKS),
    origin: 'lovac',
    idprocpte: faker.string.alphanumeric(11),
    idprodroit: faker.string.alphanumeric(13),
    locprop: faker.helpers.arrayElement([1, 2, 3, 4, 5, 6, 9]),
    propertyRight: faker.helpers.arrayElement(PROPERTY_RIGHT_VALUES),
    startDate: faker.date.past(),
    endDate: null,
    relativeLocation: faker.helpers.arrayElement(RELATIVE_LOCATION_VALUES),
    absoluteDistance: null
  })).onCreate((housingOwner) => adapter.create('housingOwners', housingOwner));
}
