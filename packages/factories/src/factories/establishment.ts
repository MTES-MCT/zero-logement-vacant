import { faker } from '@faker-js/faker/locale/fr';
import {
  ESTABLISHMENT_KIND_VALUES,
  ESTABLISHMENT_SOURCE_VALUES,
  type EstablishmentDTO
} from '@zerologementvacant/models';
import { Factory } from 'fishery';

import type { PersistenceAdapter } from '../persistence-adapter';
import { genGeoCode } from './geo-code';

export function createEstablishmentFactory(adapter: PersistenceAdapter) {
  return Factory.define<EstablishmentDTO>(({ params }) => {
    // Honour an overridden name so the short name defaults consistently to it.
    const name = params.name ?? faker.location.city();
    return {
      id: faker.string.uuid(),
      name,
      shortName: name,
      // No leading zeros: a SIREN is a 9-digit number, and the `establishments`
      // table stores it numerically — a leading zero would be lost on the
      // round-trip and break siren matching (e.g. cerema authorization).
      siren: faker.string.numeric({ length: 9, allowLeadingZeros: false }),
      available: true,
      geoCodes: faker.helpers.multiple(genGeoCode, {
        count: { min: 1, max: 10 }
      }),
      kind: faker.helpers.arrayElement(ESTABLISHMENT_KIND_VALUES),
      source: faker.helpers.arrayElement(ESTABLISHMENT_SOURCE_VALUES)
    };
  }).onCreate((entity) => adapter.create('establishments', entity));
}
