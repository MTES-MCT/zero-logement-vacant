import { Factory } from 'fishery';
import { faker } from '@faker-js/faker/locale/fr';
import {
  CADASTRAL_CLASSIFICATION_VALUES,
  DATA_FILE_YEAR_VALUES,
  ENERGY_CONSUMPTION_VALUES,
  HOUSING_KIND_VALUES,
  HOUSING_SOURCE_VALUES,
  HOUSING_STATUS_VALUES,
  HousingStatus,
  INTERNAL_CO_CONDOMINIUM_VALUES,
  INTERNAL_MONO_CONDOMINIUM_VALUES,
  MUTATION_TYPE_VALUES,
  READ_WRITE_OCCUPANCY_VALUES,
  type HousingDTO
} from '@zerologementvacant/models';
import { match, Pattern } from 'ts-pattern';
import type { Adapter } from '../adapter';

function genGeoCode(): string {
  const geoCode = faker.helpers.arrayElement([
    faker.location.zipCode(),
    faker.helpers.arrayElement(['2A', '2B']) +
      faker.string.numeric({ length: 3 })
  ]);
  const needsReroll =
    geoCode.startsWith('00') ||
    geoCode.startsWith('20') ||
    geoCode.startsWith('96') ||
    geoCode.startsWith('97') ||
    geoCode.startsWith('98') ||
    geoCode.startsWith('99') ||
    geoCode.endsWith('999');
  return needsReroll ? genGeoCode() : geoCode;
}

export function createHousingFactory(adapter: Adapter) {
  return Factory.define<HousingDTO>(() => {
    const geoCode = genGeoCode();
    const department = geoCode.substring(0, 2);
    const locality = geoCode.substring(2, 5);
    const invariant = locality + faker.string.alpha(7);
    const localId = department + invariant;
    const dataFileYears = faker.helpers
      .arrayElements(DATA_FILE_YEAR_VALUES)
      .toSorted();
    const dataYears = dataFileYears
      .map((dataFileYear) =>
        match(dataFileYear)
          .returnType<string>()
          .with(Pattern.string.startsWith('ff-'), (y) =>
            y.substring('ff-'.length, 'ff-YYYY'.length)
          )
          .with(Pattern.string.startsWith('lovac-'), (y) =>
            y.substring('lovac-'.length, 'lovac-YYYY'.length)
          )
          .exhaustive()
      )
      .map(Number);

    return {
      id: faker.string.uuid(),
      geoCode,
      invariant,
      localId,
      rawAddress: [
        faker.location.streetAddress(),
        `${geoCode} ${faker.location.city()}`
      ],
      latitude: faker.location.latitude({ min: 43.19, max: 49.49 }),
      longitude: faker.location.longitude({ min: -1.69, max: 6.8 }),
      owner: null,
      livingArea: faker.number.int({ min: 10, max: 300 }),
      cadastralClassification: faker.helpers.arrayElement([
        null,
        ...CADASTRAL_CLASSIFICATION_VALUES
      ]),
      uncomfortable: faker.datatype.boolean(),
      vacancyStartYear: faker.date.past({ years: 20 }).getUTCFullYear(),
      housingKind: faker.helpers.arrayElement(HOUSING_KIND_VALUES),
      roomsCount: faker.number.int({ min: 0, max: 10 }),
      cadastralReference: faker.string.alpha(),
      buildingId: null,
      buildingYear: faker.date.past({ years: 100 }).getUTCFullYear(),
      taxed: faker.datatype.boolean(),
      dataYears,
      dataFileYears,
      buildingLocation: faker.string.alpha(),
      ownershipKind:
        faker.helpers.maybe(() =>
          faker.helpers.arrayElement([
            ...INTERNAL_MONO_CONDOMINIUM_VALUES,
            ...INTERNAL_CO_CONDOMINIUM_VALUES
          ])
        ) ?? null,
      status: faker.helpers.weightedArrayElement([
        {
          value: HousingStatus.NEVER_CONTACTED,
          weight: HOUSING_STATUS_VALUES.length - 1
        },
        ...HOUSING_STATUS_VALUES.filter(
          (s) => s !== HousingStatus.NEVER_CONTACTED
        ).map((s) => ({ value: s, weight: 1 }))
      ]),
      subStatus: null,
      actualEnergyConsumption: faker.helpers.arrayElement([
        null,
        ...ENERGY_CONSUMPTION_VALUES
      ]),
      energyConsumption: faker.helpers.arrayElement([
        null,
        ...ENERGY_CONSUMPTION_VALUES
      ]),
      energyConsumptionAt: faker.helpers.maybe(() => faker.date.past()) ?? null,
      occupancy: faker.helpers.arrayElement(READ_WRITE_OCCUPANCY_VALUES),
      occupancyIntended: faker.helpers.arrayElement(READ_WRITE_OCCUPANCY_VALUES),
      campaignIds: [],
      source: faker.helpers.arrayElement(HOUSING_SOURCE_VALUES),
      plotId:
        geoCode +
        faker.string.numeric({ length: 3, allowLeadingZeros: true }) +
        faker.string.alpha({ length: 2, casing: 'upper' }) +
        faker.string.numeric({ length: 4, allowLeadingZeros: true }),
      plotArea: faker.number.int({ min: 100, max: 10000 }),
      beneficiaryCount: null,
      rentalValue: faker.number.int({ min: 500, max: 1000 }),
      lastMutationType: faker.helpers.arrayElement(MUTATION_TYPE_VALUES),
      lastMutationDate:
        faker.helpers.maybe(() => faker.date.past({ years: 20 }).toJSON()) ?? null,
      lastTransactionDate:
        faker.helpers.maybe(() => faker.date.past({ years: 20 }).toJSON()) ?? null,
      lastTransactionValue:
        faker.helpers.maybe(() => Number(faker.finance.amount({ dec: 0 }))) ?? null
    };
  }).onCreate((entity) => adapter.create('housings', entity));
}
