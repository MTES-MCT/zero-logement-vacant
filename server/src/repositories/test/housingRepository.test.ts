import { faker } from '@faker-js/faker/locale/fr';
import * as turf from '@turf/turf';
import {
  AddressKinds,
  BENEFIARY_COUNT_VALUES,
  CADASTRAL_CLASSIFICATION_VALUES,
  DataFileYear,
  EnergyConsumption,
  HOUSING_KIND_VALUES,
  INTERNAL_CO_CONDOMINIUM_VALUES,
  INTERNAL_MONO_CONDOMINIUM_VALUES,
  isSecondaryOwner,
  Occupancy,
  OCCUPANCY_VALUES,
  OWNER_KIND_LABELS,
  OWNER_KIND_VALUES,
  OwnerAge,
  OwnershipKind,
  Precision,
  ROOM_COUNT_VALUES
} from '@zerologementvacant/models';

import { genGeoCode } from '@zerologementvacant/models/fixtures';
import { isDefined, Predicate } from '@zerologementvacant/utils';
import async from 'async';
import { differenceInYears } from 'date-fns';
import fp from 'lodash/fp';
import { AddressApi } from '~/models/AddressApi';
import { BuildingApi } from '~/models/BuildingApi';
import { CampaignApi } from '~/models/CampaignApi';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { GeoPerimeterApi } from '~/models/GeoPerimeterApi';
import { HousingApi } from '~/models/HousingApi';
import { HousingFiltersApi } from '~/models/HousingFiltersApi';
import { HousingOwnerApi } from '~/models/HousingOwnerApi';
import { HOUSING_STATUS_VALUES } from '~/models/HousingStatusApi';
import { LocalityApi } from '~/models/LocalityApi';
import { OwnerApi } from '~/models/OwnerApi';
import {
  Addresses,
  formatAddressApi
} from '~/repositories/banAddressesRepository';
import {
  formatGeoPerimeterApi,
  GeoPerimeters
} from '~/repositories/geoRepository';
import {
  HousingPrecisionDBO,
  HousingPrecisions,
  Precisions
} from '~/repositories/precisionRepository';
import {
  genAddressApi,
  genBuildingApi,
  genCampaignApi,
  genEstablishmentApi,
  genGeoPerimeterApi,
  genGroupApi,
  genHousingApi,
  genLocalityApi,
  genOwnerApi,
  genUserApi,
  manyOf,
  oneOf
} from '~/test/testFixtures';
import {
  Buildings,
  formatBuildingApi,
  parseBuildingApi
} from '../buildingRepository';
import {
  CampaignsHousing,
  formatCampaignHousingApi
} from '../campaignHousingRepository';
import { Campaigns, formatCampaignApi } from '../campaignRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '../establishmentRepository';
import {
  formatGroupApi,
  formatGroupHousingApi,
  Groups,
  GroupsHousing
} from '../groupRepository';
import {
  formatHousingOwnerApi,
  formatHousingOwnersApi,
  HousingOwnerDBO,
  HousingOwners
} from '../housingOwnerRepository';
import housingRepository, {
  formatHousingRecordApi,
  Housing,
  ReferenceDataYear
} from '../housingRepository';
import { formatLocalityApi, Localities } from '../localityRepository';
import { formatOwnerApi, Owners } from '../ownerRepository';
import { formatUserApi, Users } from '../userRepository';

describe('Housing repository', () => {
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
  });

  describe('find', () => {
    const housings = Array.from({ length: 10 }, () => genHousingApi());
    const owners = housings.map((housing) => housing.owner);
    const housingOwners: HousingOwnerApi[] = housings.map((housing) => ({
      ...housing.owner,
      ownerId: housing.owner.id,
      housingGeoCode: housing.geoCode,
      housingId: housing.id,
      rank: 1
    }));

    beforeAll(async () => {
      await Housing().insert(housings.map(formatHousingRecordApi));
      await Owners().insert(owners.map(formatOwnerApi));
      await HousingOwners().insert(housingOwners.map(formatHousingOwnerApi));
    });

    it('should sort by geo code and id by default', async () => {
      const actual = await housingRepository.find({
        filters: {}
      });

      expect(actual).toBeSortedBy('geoCode');
    });

    it('should include owner on demand', async () => {
      const actual = await housingRepository.find({
        filters: {},
        includes: ['owner']
      });

      expect(actual).toSatisfyAll((housing) => housing.owner !== undefined);
    });

    it('should include owner if needed by a filter', async () => {
      const owner = owners[0];

      const actual = await housingRepository.find({
        filters: {
          ownerIds: [owner.id]
        }
      });

      expect(actual).toSatisfyAll<HousingApi>(
        (housing) => housing.owner?.id === owner.id
      );
    });

    it('should include owner only once', async () => {
      const owner = owners[0];

      const actual = await housingRepository.find({
        filters: {
          ownerIds: [owner.id]
        },
        includes: ['owner']
      });

      expect(actual).toSatisfyAll<HousingApi>(
        (housing) => housing.owner?.id === owner.id
      );
    });

    it('should include precisions on demand', async () => {
      const precisions: Precision[] = await Precisions().limit(3);
      const housings: HousingApi[] = Array.from({ length: 3 }, () =>
        genHousingApi()
      );
      await Housing().insert(housings.map(formatHousingRecordApi));
      const housingPrecisions: HousingPrecisionDBO[] = precisions.flatMap(
        (precision) => {
          return housings.map((housing) => ({
            housing_geo_code: housing.geoCode,
            housing_id: housing.id,
            precision_id: precision.id,
            created_at: new Date()
          }));
        }
      );
      await HousingPrecisions().insert(housingPrecisions);

      const actual = await housingRepository.find({
        filters: {
          housingIds: housings.map((housing) => housing.id)
        },
        includes: ['precisions']
      });

      expect(actual).toSatisfyAll<HousingApi>((housing) => {
        return housing.precisions ? housing.precisions.length > 0 : false;
      });
    });

    describe('Filters', () => {
      it('should filter by housing ids', async () => {
        const houses: HousingApi[] = Array.from({ length: 4 })
          .map(() =>
            genHousingApi(faker.helpers.arrayElement(establishment.geoCodes))
          )
          // Should not return this one
          .concat(genHousingApi());
        await Housing().insert(houses.map(formatHousingRecordApi));

        const actual = await housingRepository.find({
          filters: {
            housingIds: houses.slice(0, 1).map((housing) => housing.id)
          }
        });

        expect(actual.length).toBeGreaterThanOrEqual(1);
        expect(actual).toSatisfyAll<HousingApi>((actualHousing) => {
          return houses.map((housing) => housing.id).includes(actualHousing.id);
        });
      });

      it('should exclude housing ids', async () => {
        const housings: HousingApi[] = Array.from({ length: 4 }, () =>
          genHousingApi(faker.helpers.arrayElement(establishment.geoCodes))
        );
        const includedHousings = housings.slice(0, 1);
        const excludedHousings = housings.slice(1);
        await Housing().insert(housings.map(formatHousingRecordApi));

        const actual = await housingRepository.find({
          filters: {
            all: true,
            housingIds: excludedHousings.map((housing) => housing.id)
          }
        });

        const actualIds = actual.map((actual) => actual.id);
        const includedHousingIds = includedHousings.map(
          (housing) => housing.id
        );
        const excludedHousingIds = excludedHousings.map(
          (housing) => housing.id
        );
        expect(actualIds).toIncludeAllMembers(includedHousingIds);
        expect(actualIds).not.toIncludeAnyMembers(excludedHousingIds);
      });

      describe('by intercommunality', () => {
        let intercommunality: EstablishmentApi;

        beforeEach(async () => {
          const geoCodes = Array.from({ length: 3 }, () => genGeoCode());
          intercommunality = {
            ...genEstablishmentApi(...geoCodes),
            name: 'Eurométropole de Strasbourg',
            kind: 'ME'
          };

          await Establishments().insert(
            formatEstablishmentApi(intercommunality)
          );
          const housings: HousingApi[] = [
            ...Array.from({ length: 3 }, () =>
              genHousingApi(faker.helpers.arrayElement(geoCodes))
            ),
            ...Array.from({ length: 3 }, () => genHousingApi())
          ];
          await Housing().insert(housings.map(formatHousingRecordApi));
          const owner = genOwnerApi();
          await Owners().insert(formatOwnerApi(owner));
          await HousingOwners().insert(
            housings.flatMap((housing) =>
              formatHousingOwnersApi(housing, [owner])
            )
          );
        });

        it('should filter by intercommunality', async () => {
          const actual = await housingRepository.find({
            filters: {
              intercommunalities: [intercommunality.id]
            }
          });

          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            return intercommunality.geoCodes.includes(housing.geoCode);
          });
        });
      });

      describe('by occupancy', () => {
        beforeEach(async () => {
          const housings: HousingApi[] = OCCUPANCY_VALUES.map((occupancy) => ({
            ...genHousingApi(),
            occupancy
          }));
          await Housing().insert(housings.map(formatHousingRecordApi));
          const owner = genOwnerApi();
          await Owners().insert(formatOwnerApi(owner));
          await HousingOwners().insert(
            housings.flatMap((housing) =>
              formatHousingOwnersApi(housing, [owner])
            )
          );
        });

        test.each(OCCUPANCY_VALUES)(
          'should filter by %s',
          async (occupancy) => {
            const actual = await housingRepository.find({
              filters: {
                occupancies: [occupancy]
              }
            });

            expect(actual.length).toBeGreaterThan(0);
            expect(actual).toSatisfyAll<HousingApi>(
              (housing) => housing.occupancy === occupancy
            );
          }
        );
      });

      describe('by energy consumption', () => {
        it('should keep housings that have no energy consumption filled', async () => {
          const housing: HousingApi = {
            ...genHousingApi(),
            energyConsumption: null
          };
          await Housing().insert(formatHousingRecordApi(housing));

          const actual = await housingRepository.find({
            filters: {
              energyConsumption: [null]
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            return housing.energyConsumption === null;
          });
        });

        it('should filter by energy consumption', async () => {
          const actualA = await housingRepository.find({
            filters: {
              energyConsumption: ['A']
            }
          });
          expect(actualA).toSatisfyAll<HousingApi>(
            (housing) => housing.energyConsumption === 'A'
          );

          const EFGClasses: Array<EnergyConsumption | null> = ['E', 'F', 'G'];
          const actualEFG = await housingRepository.find({
            filters: {
              energyConsumption: EFGClasses
            }
          });
          expect(actualEFG).toSatisfyAll<HousingApi>((housing) =>
            EFGClasses.includes(housing.energyConsumption)
          );
        });
      });

      it('should filter by establishment', async () => {
        const otherEstablishment = genEstablishmentApi();
        await Establishments().insert(
          formatEstablishmentApi(otherEstablishment)
        );
        const houses: HousingApi[] = [
          genHousingApi(oneOf(establishment.geoCodes)),
          genHousingApi(oneOf(otherEstablishment.geoCodes))
        ];
        await Housing().insert(houses.map(formatHousingRecordApi));

        const actual = await housingRepository.find({
          filters: {
            establishmentIds: [establishment.id]
          }
        });

        expect(actual).toSatisfyAll<HousingApi>((housing) =>
          establishment.geoCodes.includes(housing.geoCode)
        );
      });

      it('should filter by group', async () => {
        const groups = Array.from({ length: 2 }).map(() =>
          genGroupApi(user, establishment)
        );
        await Groups().insert(groups.map(formatGroupApi));
        const housesByGroup = fp.fromPairs(
          groups.map((group) => {
            const houses: HousingApi[] = Array.from({ length: 3 }).map(() =>
              genHousingApi(oneOf(establishment.geoCodes))
            );
            return [group.id, houses];
          })
        );
        const houses: HousingApi[] = fp.values(housesByGroup).flat();
        await Housing().insert(houses.map(formatHousingRecordApi));
        await GroupsHousing().insert(
          groups.flatMap((group) => {
            return formatGroupHousingApi(
              group,
              manyOf(
                housesByGroup[group.id],
                faker.number.int({ min: 1, max: 3 })
              )
            );
          })
        );
        const [firstGroup] = groups;

        const actual = await housingRepository.find({
          filters: {
            groupIds: [firstGroup.id]
          }
        });

        expect(actual).toSatisfyAll<HousingApi>((actualHousing) => {
          return housesByGroup[firstGroup.id]
            .map((housing) => housing.id)
            .includes(actualHousing.id);
        });
      });

      describe('by campaign id', () => {
        let campaigns: ReadonlyArray<CampaignApi>;

        beforeEach(async () => {
          campaigns = Array.from({ length: 3 }, () =>
            genCampaignApi(establishment.id, user.id)
          );
          await Campaigns().insert(campaigns.map(formatCampaignApi));
          const campaignHousings = campaigns.map((campaign) => {
            return {
              campaign: campaign,
              housings: Array.from({ length: 3 }, () => genHousingApi())
            };
          });
          const housings = campaignHousings.flatMap(({ housings }) => housings);
          await Housing().insert(housings.map(formatHousingRecordApi));
          await CampaignsHousing().insert(
            campaignHousings.flatMap((ch) => {
              return formatCampaignHousingApi(ch.campaign, ch.housings);
            })
          );
        });

        it('should keep housings that are not in a campaign', async () => {
          const housing = genHousingApi();
          await Housing().insert(formatHousingRecordApi(housing));

          const actual = await housingRepository.find({
            filters: {
              campaignIds: [null]
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            return housing.campaignIds?.length === 0;
          });
        });

        it('should filter by campaign id', async () => {
          const id = campaigns[0].id;
          const actual = await housingRepository.find({
            filters: {
              campaignIds: [id]
            }
          });

          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            return housing.campaignIds?.includes(id) ?? false;
          });
        });
      });

      describe('by owner’s age', () => {
        function createOwner(age: number | null): OwnerApi {
          return {
            ...genOwnerApi(),
            birthDate:
              age === null
                ? null
                : faker.date
                    .birthdate({
                      min: age,
                      max: age,
                      mode: 'age'
                    })
                    .toJSON()
          };
        }

        beforeAll(async () => {
          const owners: OwnerApi[] = [
            createOwner(null),
            createOwner(39),
            createOwner(40),
            createOwner(59),
            createOwner(60),
            createOwner(74),
            createOwner(75),
            createOwner(99),
            createOwner(100)
          ];
          await Owners().insert(owners.map(formatOwnerApi));
          const housingList: HousingApi[] = owners.map(() => genHousingApi());
          await Housing().insert(housingList.map(formatHousingRecordApi));
          await HousingOwners().insert(
            housingList.flatMap((housing, i) =>
              formatHousingOwnersApi(housing, owners.slice(i, i + 1))
            )
          );
        });

        const tests: ReadonlyArray<{
          name: string;
          filter: Array<OwnerAge | null>;
          predicate(owner: OwnerApi): boolean;
        }> = [
          {
            name: 'unfilled birth date',
            filter: [null],
            predicate: (owner) => owner.birthDate === null
          },
          {
            name: 'less than 40 years old',
            filter: ['lt40'],
            predicate: (owner) =>
              differenceInYears(new Date(), owner.birthDate as string) < 40
          },
          {
            name: 'between 40 and 59 years old',
            filter: ['40to59'],
            predicate: (owner: OwnerApi) => {
              const diff = differenceInYears(
                new Date(),
                owner.birthDate as string
              );
              return 40 <= diff && diff <= 59;
            }
          },
          {
            name: 'between 60 and 74 years old',
            filter: ['60to74'],
            predicate: (owner: OwnerApi) => {
              const diff = differenceInYears(
                new Date(),
                owner.birthDate as string
              );
              return 60 <= diff && diff <= 74;
            }
          },
          {
            name: 'between 75 and 99 years old',
            filter: ['75to99'],
            predicate: (owner: OwnerApi) => {
              const diff = differenceInYears(
                new Date(),
                owner.birthDate as string
              );
              return 75 <= diff && diff <= 99;
            }
          },
          {
            name: '100 years old and more',
            filter: ['gte100'],
            predicate: (owner) =>
              differenceInYears(new Date(), owner.birthDate as string) >= 100
          }
        ];

        test.each(tests)('should keep $name', async ({ filter, predicate }) => {
          const actual = await housingRepository.find({
            filters: {
              ownerAges: filter
            },
            includes: ['owner']
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>(
            (housing) => !!housing.owner && predicate(housing.owner)
          );
        });
      });

      it('should filter by owner ids', async () => {
        const housings = Array.from({ length: 3 }, () => genHousingApi());
        await Housing().insert(housings.map(formatHousingRecordApi));
        await Owners().insert(
          housings.map((housing) => formatOwnerApi(housing.owner))
        );
        await HousingOwners().insert(
          housings.flatMap((housing) =>
            formatHousingOwnersApi(housing, [housing.owner])
          )
        );

        const actual = await housingRepository.find({
          filters: {
            ownerIds: housings.map((housing) => housing.owner.id)
          }
        });

        expect(actual).toBeArrayOfSize(housings.length);
        expect(actual).toSatisfyAll<HousingApi>((actual) => {
          return housings.map((housing) => housing.id).includes(actual.id);
        });
      });

      describe('by owner kind', () => {
        const kinds = OWNER_KIND_VALUES;

        beforeEach(async () => {
          const housings = Array.from({ length: kinds.length }, () =>
            genHousingApi()
          );
          await Housing().insert(housings.map(formatHousingRecordApi));
          const owners: OwnerApi[] = Object.values(OWNER_KIND_LABELS).map(
            (kind, i) => {
              return { ...housings[i].owner, kind };
            }
          );
          await Owners().insert(owners.map(formatOwnerApi));
          await HousingOwners().insert(
            housings.flatMap((housing) =>
              formatHousingOwnersApi(housing, [housing.owner])
            )
          );
        });

        it('should keep owners that have an empty kind', async () => {
          const housing = genHousingApi();
          await Housing().insert(formatHousingRecordApi(housing));
          const owner: OwnerApi = {
            ...genOwnerApi(),
            kind: null
          };
          await Owners().insert(formatOwnerApi(owner));
          await HousingOwners().insert(
            formatHousingOwnersApi(housing, [owner])
          );

          const actual = await housingRepository.find({
            filters: {
              ownerKinds: [null]
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            return housing.owner?.kind === null;
          });
        });

        test.each(kinds)('should filter by %s', async (kind) => {
          const actual = await housingRepository.find({
            filters: {
              ownerKinds: [kind]
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            return housing.owner?.kind === OWNER_KIND_LABELS[kind];
          });
        });
      });

      describe('by multi owners', () => {
        beforeEach(async () => {
          const housings = Array.from({ length: 3 }, () => genHousingApi());
          await Housing().insert(housings.map(formatHousingRecordApi));
          const owner = genOwnerApi();
          const anotherOwner = genOwnerApi();
          await Owners().insert([owner, anotherOwner].map(formatOwnerApi));
          const housingOwners = housings
            .slice(0, 2)
            .flatMap((housing) => formatHousingOwnersApi(housing, [owner]))
            .concat(
              housings
                .slice(2)
                .flatMap((housing) =>
                  formatHousingOwnersApi(housing, [anotherOwner])
                )
            );
          await HousingOwners().insert(housingOwners);
        });

        function countOwners(
          expected: Predicate<number>
        ): (housings: ReadonlyArray<HousingApi>) => boolean {
          return fp.pipe(
            fp.map((housing: HousingApi) => housing.owner),
            fp.groupBy('id'),
            fp.mapValues(fp.size),
            fp.values,
            fp.every(expected)
          );
        }

        const tests = [
          {
            name: 'housings belonging to owners who have many properties',
            filter: [true],
            predicate: countOwners((count) => count > 1)
          },
          {
            name: 'housings belonging to owners who have only one property',
            filter: [false],
            predicate: countOwners((count) => count === 1)
          }
        ];

        test.each(tests)('should keep $name', async ({ filter, predicate }) => {
          const actual = await housingRepository.find({
            filters: {
              multiOwners: filter
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfy<ReadonlyArray<HousingApi>>(predicate);
        });
      });

      describe('by beneficiary count', () => {
        beforeEach(async () => {
          const housings = Array.from(
            { length: BENEFIARY_COUNT_VALUES.length },
            () => genHousingApi()
          );
          await Housing().insert(housings.map(formatHousingRecordApi));
          const housingOwners = housings.map((housing, i) => {
            return {
              housing,
              owners: Array.from({ length: i + 1 }, () => genOwnerApi())
            };
          });
          const owners = housingOwners.flatMap(
            (housingOwner) => housingOwner.owners
          );
          await Owners().insert(owners.map(formatOwnerApi));
          await HousingOwners().insert(
            housingOwners.flatMap((housingOwner) =>
              formatHousingOwnersApi(housingOwner.housing, housingOwner.owners)
            )
          );
        });

        const tests = BENEFIARY_COUNT_VALUES.map(Number)
          .filter((count) => !Number.isNaN(count))
          .map((count) => {
            return {
              name: `housings that have ${count} secondary owner(s)`,
              filter: [String(count)],
              predicate(housingOwners: ReadonlyArray<HousingOwnerDBO>) {
                return (
                  housingOwners.filter((housingOwner) => housingOwner.rank >= 2)
                    .length === count
                );
              }
            };
          })
          .concat({
            name: `housings that have 5+ secondary owners`,
            filter: ['gte5'],
            predicate(housingOwners: ReadonlyArray<HousingOwnerDBO>) {
              return housingOwners.filter(isSecondaryOwner).length >= 5;
            }
          })
          .concat({
            name: 'housings that have 0 or 5+ secondary owners',
            filter: ['0', 'gte5'],
            predicate(housingOwners: ReadonlyArray<HousingOwnerDBO>) {
              return (
                housingOwners.filter(isSecondaryOwner).length === 0 ||
                housingOwners.filter(isSecondaryOwner).length >= 5
              );
            }
          });
        test.each(tests)('should keep $name', async ({ filter, predicate }) => {
          const actual = await housingRepository.find({
            filters: {
              beneficiaryCounts: filter
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          await async.forEach(actual, async (housing) => {
            const actualHousingOwners = await HousingOwners().where({
              housing_geo_code: housing.geoCode,
              housing_id: housing.id
            });
            expect(actualHousingOwners).toSatisfy<
              ReadonlyArray<HousingOwnerDBO>
            >(predicate);
          });
        });
      });

      describe('by housing kind', () => {
        beforeEach(async () => {
          const housings = HOUSING_KIND_VALUES.map((kind) => {
            return { ...genHousingApi(), kind };
          });
          await Housing().insert(housings.map(formatHousingRecordApi));
        });

        test.each(HOUSING_KIND_VALUES)('should filter by %s', async (kind) => {
          const actual = await housingRepository.find({
            filters: {
              housingKinds: [kind]
            }
          });

          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            return housing.housingKind === kind;
          });
        });
      });

      describe('by living area', () => {
        beforeEach(async () => {
          const housingList: HousingApi[] = [
            { ...genHousingApi(), livingArea: 34 },
            { ...genHousingApi(), livingArea: 35 },
            { ...genHousingApi(), livingArea: 74 },
            { ...genHousingApi(), livingArea: 75 },
            { ...genHousingApi(), livingArea: 99 },
            { ...genHousingApi(), livingArea: 100 }
          ];
          await Housing().insert(housingList.map(formatHousingRecordApi));
        });

        const tests = [
          {
            name: 'less than 35 m2',
            filter: ['lt35'],
            predicate: (housing: HousingApi) =>
              housing.livingArea !== null && housing.livingArea < 35
          },
          {
            name: 'between 35 and 74 m2',
            filter: ['35to74'],
            predicate: (housing: HousingApi) =>
              housing.livingArea !== null &&
              35 <= housing.livingArea &&
              housing.livingArea <= 74
          },
          {
            name: 'between 75 and 99 m2',
            filter: ['75to99'],
            predicate: (housing: HousingApi) =>
              housing.livingArea !== null &&
              75 <= housing.livingArea &&
              housing.livingArea <= 99
          },
          {
            name: 'more than 100 m2',
            filter: ['gte100'],
            predicate: (housing: HousingApi) =>
              housing.livingArea !== null && housing.livingArea >= 100
          }
        ];

        test.each(tests)('should keep $name', async ({ filter, predicate }) => {
          const actual = await housingRepository.find({
            filters: {
              housingAreas: filter
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>(predicate);
        });
      });

      describe('by room count', () => {
        beforeEach(async () => {
          const housings = Array.from({ length: 10 }).map<HousingApi>(
            (_, i) => {
              return {
                ...genHousingApi(),
                roomsCount: i + 1
              };
            }
          );
          await Housing().insert(housings.map(formatHousingRecordApi));
        });

        const tests = ROOM_COUNT_VALUES.map(Number)
          .filter((count) => !Number.isNaN(count))
          .map((count) => {
            return {
              name: `housings with ${count} room(s)`,
              filter: [String(count)],
              predicate(housing: HousingApi) {
                return housing.roomsCount === count;
              }
            };
          })
          .concat({
            name: 'housings with 5+ rooms',
            filter: ['gte5'],
            predicate(housing: HousingApi) {
              return housing.roomsCount !== null && housing.roomsCount >= 5;
            }
          });

        test.each(tests)('should keep $name', async ({ filter, predicate }) => {
          const actual = await housingRepository.find({
            filters: {
              roomsCounts: filter
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>(predicate);
        });
      });

      describe('by cadastral classification', () => {
        const cadastralClassifications = [
          null,
          ...CADASTRAL_CLASSIFICATION_VALUES
        ];

        beforeAll(async () => {
          const housings: ReadonlyArray<HousingApi> =
            cadastralClassifications.map((cadastralClassification) => {
              return { ...genHousingApi(), cadastralClassification };
            });
          await Housing().insert(housings.map(formatHousingRecordApi));
        });

        test.each(cadastralClassifications)(
          'should filter by cadastral classification = %s',
          async (cadastralClassification) => {
            const actual = await housingRepository.find({
              filters: {
                cadastralClassifications: [cadastralClassification]
              }
            });

            expect(actual.length).toBeGreaterThan(0);
            expect(actual).toSatisfyAll<HousingApi>((housing) => {
              return (
                housing.cadastralClassification === cadastralClassification
              );
            });
          }
        );
      });

      describe('by building period', () => {
        beforeEach(async () => {
          const housings: ReadonlyArray<HousingApi> = [
            { ...genHousingApi(), buildingYear: 1918 },
            { ...genHousingApi(), buildingYear: 1919 },
            { ...genHousingApi(), buildingYear: 1945 },
            { ...genHousingApi(), buildingYear: 1946 },
            { ...genHousingApi(), buildingYear: 1990 },
            { ...genHousingApi(), buildingYear: 1991 }
          ];
          await Housing().insert(housings.map(formatHousingRecordApi));
        });

        const tests = [
          {
            name: 'housings built before 1919',
            filter: ['lt1919'],
            predicate(housing: HousingApi) {
              return !!housing.buildingYear && housing.buildingYear < 1919;
            }
          },
          {
            name: 'housings built between 1919 and 1945',
            filter: ['1919to1945'],
            predicate(housing: HousingApi) {
              return (
                !!housing.buildingYear &&
                1919 <= housing.buildingYear &&
                housing.buildingYear <= 1945
              );
            }
          },
          {
            name: 'housings built between 1946 and 1990',
            filter: ['1946to1990'],
            predicate(housing: HousingApi) {
              return (
                !!housing.buildingYear &&
                1946 <= housing.buildingYear &&
                housing.buildingYear <= 1990
              );
            }
          },
          {
            name: 'housings built after 1990',
            filter: ['gte1991'],
            predicate(housing: HousingApi) {
              return !!housing.buildingYear && housing.buildingYear >= 1991;
            }
          },
          {
            name: 'housings built before 1919 or after 1990',
            filter: ['lt1919', 'gte1991'],
            predicate(housing: HousingApi) {
              return (
                !!housing.buildingYear &&
                (housing.buildingYear < 1919 || housing.buildingYear >= 1991)
              );
            }
          }
        ];

        test.each(tests)('should keep $name', async ({ filter, predicate }) => {
          const actual = await housingRepository.find({
            filters: {
              buildingPeriods: filter
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>(predicate);
        });
      });

      describe('by vacancy duration', () => {
        beforeEach(async () => {
          const housingList: HousingApi[] = new Array(16)
            .fill('0')
            .map((_, i) => ({
              ...genHousingApi(),
              vacancyStartYear: ReferenceDataYear - i
            }))
            .concat([
              {
                ...genHousingApi(),
                vacancyStartYear: 0
              }
            ]);
          await Housing().insert(housingList.map(formatHousingRecordApi));
        });

        const tests = [
          {
            name: '2021',
            filter: ['2021'],
            predicate: (housing: HousingApi) =>
              (housing.vacancyStartYear as number) === 2021
          },
          {
            name: '2020',
            filter: ['2020'],
            predicate: (housing: HousingApi) =>
              (housing.vacancyStartYear as number) === 2020
          },
          {
            name: '2019',
            filter: ['2019'],
            predicate: (housing: HousingApi) =>
              (housing.vacancyStartYear as number) === 2019
          },
          {
            name: 'Entre 2018 et 2015',
            filter: ['2018to2015'],
            predicate: (housing: HousingApi) => {
              const vacancyStartYear = housing.vacancyStartYear as number;
              return vacancyStartYear >= 2015 && vacancyStartYear <= 2018;
            }
          },
          {
            name: 'Entre 2014 et 2010',
            filter: ['2014to2010'],
            predicate: (housing: HousingApi) => {
              const vacancyStartYear = housing.vacancyStartYear as number;
              return vacancyStartYear >= 2010 && vacancyStartYear < 2015;
            }
          },
          {
            name: 'Avant 2010',
            filter: ['before2010'],
            predicate: (housing: HousingApi) =>
              (housing.vacancyStartYear as number) < 2010
          },
          {
            name: 'Pas d’information',
            filter: ['missingData'],
            predicate: (housing: HousingApi) =>
              (housing.vacancyStartYear as number) === 0
          },
          {
            name: '2022 (incohérence donnée source)',
            filter: ['inconsistency2022'],
            predicate: (housing: HousingApi) =>
              (housing.vacancyStartYear as number) === 2022
          }
        ];

        test.each(tests)('should keep $name', async ({ filter, predicate }) => {
          const actual = await housingRepository.find({
            filters: {
              vacancyYears: filter
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>(predicate);
        });
      });

      describe('by taxed', () => {
        beforeEach(async () => {
          const housings: ReadonlyArray<HousingApi> = [
            { ...genHousingApi(), taxed: true },
            { ...genHousingApi(), taxed: false },
            { ...genHousingApi(), taxed: undefined }
          ];
          await Housing().insert(housings.map(formatHousingRecordApi));
        });

        const tests = [
          {
            name: 'housings that get taxed',
            filter: [true],
            predicate: (housing: HousingApi) => !!housing.taxed
          },
          {
            name: 'housings that do not get taxed',
            filter: [false],
            predicate: (housing: HousingApi) => !housing.taxed
          }
        ];

        test.each(tests)('should keep $name', async ({ filter, predicate }) => {
          const actual = await housingRepository.find({
            filters: {
              isTaxedValues: filter
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>(predicate);
        });
      });

      describe('by ownership kind', () => {
        beforeEach(async () => {
          const housings: ReadonlyArray<HousingApi> = [
            // Monopropriété
            { ...genHousingApi(), ownershipKind: 'single' },
            { ...genHousingApi(), ownershipKind: undefined },
            // Copropriété
            { ...genHousingApi(), ownershipKind: 'CL' },
            { ...genHousingApi(), ownershipKind: 'co' },
            { ...genHousingApi(), ownershipKind: 'CLV' },
            { ...genHousingApi(), ownershipKind: 'CV' },
            // Autre
            { ...genHousingApi(), ownershipKind: 'BND' },
            { ...genHousingApi(), ownershipKind: 'MP' },
            { ...genHousingApi(), ownershipKind: 'TF' }
          ];
          await Housing().insert(housings.map(formatHousingRecordApi));
        });

        const tests: ReadonlyArray<{
          name: string;
          filter: OwnershipKind[];
          predicate: Predicate<HousingApi>;
        }> = [
          {
            name: 'housings that are single-owned',
            filter: ['single'],
            predicate: (housing: HousingApi) =>
              !housing.ownershipKind || housing.ownershipKind === 'single'
          },
          {
            name: 'housings that are co-owned',
            filter: ['co'],
            predicate: (housing: HousingApi) => {
              return (
                !!housing.ownershipKind &&
                (
                  INTERNAL_CO_CONDOMINIUM_VALUES as ReadonlyArray<string>
                ).includes(housing.ownershipKind)
              );
            }
          },
          {
            name: 'other housings',
            filter: ['other'],
            predicate: (housing: HousingApi) => {
              const values = [
                ...INTERNAL_MONO_CONDOMINIUM_VALUES,
                ...INTERNAL_CO_CONDOMINIUM_VALUES
              ] as ReadonlyArray<string>;
              return (
                !!housing.ownershipKind &&
                !values.includes(housing.ownershipKind)
              );
            }
          },
          {
            name: 'single-owned and co-owned housings',
            filter: ['single', 'co'],
            predicate: (housing: HousingApi) => {
              const values = [
                ...INTERNAL_MONO_CONDOMINIUM_VALUES,
                ...INTERNAL_CO_CONDOMINIUM_VALUES
              ] as ReadonlyArray<string>;
              return (
                !housing.ownershipKind || values.includes(housing.ownershipKind)
              );
            }
          },
          {
            name: 'single-owned and other housings',
            filter: ['single', 'other'],
            predicate: (housing: HousingApi) => {
              const values =
                INTERNAL_CO_CONDOMINIUM_VALUES as ReadonlyArray<string>;
              return (
                !housing.ownershipKind ||
                !values.includes(housing.ownershipKind)
              );
            }
          },
          {
            name: 'co-owned and other housings',
            filter: ['co', 'other'],
            predicate: (housing: HousingApi) => {
              const values =
                INTERNAL_MONO_CONDOMINIUM_VALUES as ReadonlyArray<string>;
              return (
                !!housing.ownershipKind &&
                !values.includes(housing.ownershipKind)
              );
            }
          }
        ];

        test.each(tests)('should keep $name', async ({ filter, predicate }) => {
          const actual = await housingRepository.find({
            filters: {
              ownershipKinds: filter
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>(predicate);
        });
      });

      describe('by housing count by building', () => {
        function createHousingByBuilding(building: BuildingApi): HousingApi[] {
          return Array.from({ length: building.housingCount }).map(() => ({
            ...genHousingApi(),
            buildingId: building.id
          }));
        }

        beforeEach(async () => {
          const testAmounts = [4, 5, 19, 20, 49, 50];

          const buildings: BuildingApi[] = testAmounts.map((amount) => {
            return {
              ...genBuildingApi(),
              housingCount: amount
            };
          });
          await Buildings().insert(buildings.map(formatBuildingApi));

          const housingByBuilding: HousingApi[][] = buildings.map((building) =>
            createHousingByBuilding(building)
          );
          const housingList = housingByBuilding.flat();
          await Housing().insert(housingList.map(formatHousingRecordApi));
          const owner = genOwnerApi();
          await Owners().insert(formatOwnerApi(owner));
          await HousingOwners().insert(
            housingList.flatMap((housing) =>
              formatHousingOwnersApi(housing, [owner])
            )
          );
        });

        const tests = [
          {
            name: 'less than 5',
            filter: ['lt5'],
            predicate: (building: BuildingApi) => {
              return building.housingCount < 5;
            }
          },
          {
            name: 'between 5 and 19',
            filter: ['5to19'],
            predicate: (building: BuildingApi) => {
              return 5 <= building.housingCount && building.housingCount <= 19;
            }
          },
          {
            name: 'between 20 and 49',
            filter: ['20to49'],
            predicate: (building: BuildingApi) => {
              return 20 <= building.housingCount && building.housingCount <= 49;
            }
          },
          {
            name: '50 and more',
            filter: ['gte50'],
            predicate: (building: BuildingApi) => {
              return building.housingCount >= 50;
            }
          }
        ];

        test.each(tests)('should keep $name', async ({ filter, predicate }) => {
          const actual = await housingRepository.find({
            filters: {
              housingCounts: filter
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          const ids = fp.uniq(
            actual.map((housing) => housing.buildingId).filter(isDefined)
          );
          const buildings = await Buildings()
            .whereIn('id', ids)
            .then((buildings) => buildings.map(parseBuildingApi));
          expect(buildings).toSatisfyAll<BuildingApi>(predicate);
        });
      });

      describe('by vacancy rate by building', () => {
        function createHousingByBuilding(building: BuildingApi): HousingApi[] {
          return Array.from({ length: building.vacantHousingCount }, () => ({
            ...genHousingApi(building.id.substring(0, 5)),
            occupancy: Occupancy.VACANT,
            buildingId: building.id
          })).concat(
            Array.from(
              { length: building.housingCount - building.vacantHousingCount },
              () => ({
                ...genHousingApi(),
                buildingId: building.id,
                occupancy: Occupancy.UNKNOWN
              })
            )
          );
        }

        beforeEach(async () => {
          const testAmounts = [
            { vacant: 19, total: 100 },
            { vacant: 2, total: 10 },
            { vacant: 39, total: 100 },
            { vacant: 4, total: 10 },
            { vacant: 59, total: 100 },
            { vacant: 6, total: 10 },
            { vacant: 79, total: 100 },
            { vacant: 8, total: 10 }
          ];

          const buildings: BuildingApi[] = testAmounts.map(
            ({ vacant, total }) => {
              return {
                ...genBuildingApi(),
                vacantHousingCount: vacant,
                housingCount: total
              };
            }
          );
          await Buildings().insert(buildings.map(formatBuildingApi));

          const housingByBuilding: HousingApi[][] = buildings.map((building) =>
            createHousingByBuilding(building)
          );
          const housingList = housingByBuilding.flat();
          await Housing().insert(housingList.map(formatHousingRecordApi));
        });

        const tests = [
          {
            name: 'less than 20 %',
            filter: ['lt20'],
            predicate: (building: BuildingApi) => {
              return building.vacantHousingCount / building.housingCount < 0.2;
            }
          },
          {
            name: 'between 20 and 39 %',
            filter: ['20to39'],
            predicate: (building: BuildingApi) => {
              const rate = building.vacantHousingCount / building.housingCount;
              return 0.2 <= rate && rate <= 0.39;
            }
          },
          {
            name: 'between 40 and 59 %',
            filter: ['40to59'],
            predicate: (building: BuildingApi) => {
              const rate = building.vacantHousingCount / building.housingCount;
              return 0.4 <= rate && rate <= 0.59;
            }
          },
          {
            name: 'between 60 and 79 %',
            filter: ['60to79'],
            predicate: (building: BuildingApi) => {
              const rate = building.vacantHousingCount / building.housingCount;
              return 0.6 <= rate && rate <= 0.79;
            }
          },
          {
            name: '80 % and more',
            filter: ['gte80'],
            predicate: (building: BuildingApi) => {
              return building.vacantHousingCount / building.housingCount >= 0.8;
            }
          }
        ];

        test.each(tests)('should keep $name', async ({ filter, predicate }) => {
          const actual = await housingRepository.find({
            filters: {
              vacancyRates: filter
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          const ids = fp.uniq(
            actual.map((housing) => housing.buildingId).filter(isDefined)
          );
          const buildings = await Buildings()
            .whereIn('id', ids)
            .then((buildings) => buildings.map(parseBuildingApi));
          expect(buildings).toSatisfyAll<BuildingApi>(predicate);
        });
      });

      describe('by locality', () => {
        const geoCodes = ['12345', '23456', '34567'];

        beforeEach(async () => {
          const housings = geoCodes.map((geoCode) => genHousingApi(geoCode));
          await Housing().insert(housings.map(formatHousingRecordApi));
        });

        test.each(geoCodes)(
          `should keep housings that have the geo code %s`,
          async (geoCode) => {
            const actual = await housingRepository.find({
              filters: {
                localities: [geoCode]
              }
            });

            expect(actual.length).toBeGreaterThan(0);
            expect(actual).toSatisfyAll<HousingApi>(
              (housing) => housing.geoCode === geoCode
            );
          }
        );
      });

      describe('by locality kind', () => {
        it('should filter by empty locality kind', async () => {
          const locality: LocalityApi = {
            ...genLocalityApi(),
            kind: null
          };
          await Localities().insert(formatLocalityApi(locality));
          const housing = genHousingApi(locality.geoCode);
          await Housing().insert(formatHousingRecordApi(housing));

          const actual = await housingRepository.find({
            filters: {
              localityKinds: [null]
            }
          });

          const actualLocalities =
            await Localities().whereNull('locality_kind');
          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            return actualLocalities.some(
              (locality) => locality.geo_code === housing.geoCode
            );
          });
        });

        it('should filter by locality kind', async () => {
          const localities: LocalityApi[] = [
            { ...genLocalityApi(), kind: 'ACV' },
            { ...genLocalityApi(), kind: 'PVD' }
          ];
          await Localities().insert(localities.map(formatLocalityApi));
          const housingList = new Array(10).fill('0').map(() => {
            const geoCode = oneOf(localities).geoCode;
            return genHousingApi(geoCode);
          });
          await Housing().insert(housingList.map(formatHousingRecordApi));

          const actual = await housingRepository.find({
            filters: {
              localityKinds: ['ACV', 'PVD']
            }
          });

          const actualLocalities = await Localities().whereIn('locality_kind', [
            'ACV',
            'PVD'
          ]);
          expect(actual).toSatisfyAll<HousingApi>((housing) =>
            actualLocalities
              .map((locality) => locality.geo_code)
              .includes(housing.geoCode)
          );
        });
      });

      describe('by included perimeter', () => {
        it('should keep housings within the perimeter', async () => {
          const box = turf.multiPolygon([
            [
              [
                [2, 48],
                [2, 49],
                [3, 49],
                [3, 48],
                [2, 48]
              ]
            ]
          ]);
          const perimeter: GeoPerimeterApi = {
            ...genGeoPerimeterApi(establishment.id, user),
            geometry: box.geometry
          };
          await GeoPerimeters().insert(formatGeoPerimeterApi(perimeter));
          const housings: ReadonlyArray<HousingApi> = [
            { ...genHousingApi(), longitude: 2.5, latitude: 48.5 },
            { ...genHousingApi(), longitude: 2, latitude: 47.9 },
            { ...genHousingApi(), longitude: 1.9, latitude: 48 }
          ];
          await Housing().insert(housings.map(formatHousingRecordApi));

          const actual = await housingRepository.find({
            filters: {
              geoPerimetersIncluded: [perimeter.kind]
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            if (
              housing.longitude === undefined ||
              housing.latitude === undefined
            ) {
              return false;
            }

            const point = turf.point([housing.longitude, housing.latitude]);
            return turf.booleanPointInPolygon(point, box);
          });
        });
      });

      describe('by excluded perimeter', () => {
        it('should keep housings outside the perimeter', async () => {
          const box = turf.multiPolygon([
            [
              [
                [2, 48],
                [2, 49],
                [3, 49],
                [3, 48],
                [2, 48]
              ]
            ]
          ]);
          const perimeter: GeoPerimeterApi = {
            ...genGeoPerimeterApi(establishment.id, user),
            geometry: box.geometry
          };
          await GeoPerimeters().insert(formatGeoPerimeterApi(perimeter));
          const housings: ReadonlyArray<HousingApi> = [
            { ...genHousingApi(), longitude: 2.5, latitude: 48.5 },
            { ...genHousingApi(), longitude: 2, latitude: 47.9 },
            { ...genHousingApi(), longitude: 1.9, latitude: 48 }
          ];
          await Housing().insert(housings.map(formatHousingRecordApi));

          const actual = await housingRepository.find({
            filters: {
              geoPerimetersExcluded: [perimeter.kind]
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            if (!housing.longitude || !housing.latitude) {
              return true;
            }

            const point = turf.point([housing.longitude, housing.latitude]);
            return !turf.booleanPointInPolygon(point, box);
          });
        });
      });

      describe('by included data file year', () => {
        beforeEach(async () => {
          const housings = Array.from({ length: 10 }, () => genHousingApi());
          await Housing().insert(housings.map(formatHousingRecordApi));
        });

        it('should keep housings that have no data file years', async () => {
          const housings: ReadonlyArray<HousingApi> = [
            { ...genHousingApi(), dataFileYears: [] }
          ];
          await Housing().insert(housings.map(formatHousingRecordApi));

          const actual = await housingRepository.find({
            filters: {
              dataFileYearsIncluded: [null]
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            return (
              housing.dataFileYears === undefined ||
              housing.dataFileYears.length === 0
            );
          });
        });

        it('should keep housings that belong to the given data file year', async () => {
          const dataFileYears: HousingFiltersApi['dataFileYearsIncluded'] = [
            'lovac-2023',
            'lovac-2024'
          ];

          const actual = await housingRepository.find({
            filters: {
              dataFileYearsIncluded: dataFileYears
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            const set = new Set(dataFileYears);
            return housing.dataFileYears.some((dataFileYear) =>
              set.has(dataFileYear as DataFileYear)
            );
          });
        });
      });

      describe('by excluded data file year', () => {
        beforeEach(() => {
          const housings = Array.from({ length: 10 }, () => genHousingApi());
          return Housing().insert(housings.map(formatHousingRecordApi));
        });

        it('should skip housings that have no data file years', async () => {
          const housings: ReadonlyArray<HousingApi> = [
            { ...genHousingApi(), dataFileYears: [] }
          ];
          await Housing().insert(housings.map(formatHousingRecordApi));

          const actual = await housingRepository.find({
            filters: {
              dataFileYearsExcluded: [null]
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            return housing.dataFileYears.length > 0;
          });
        });

        it('should keep housings that do not belong to the given data file year', async () => {
          const dataFileYears: HousingFiltersApi['dataFileYearsExcluded'] = [
            'lovac-2023',
            'lovac-2024'
          ];

          const actual = await housingRepository.find({
            filters: {
              dataFileYearsExcluded: dataFileYears
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            const set = new Set(dataFileYears);
            return !housing.dataFileYears.some((dataFileYear) =>
              set.has(dataFileYear as DataFileYear)
            );
          });
        });
      });

      describe('by status', () => {
        beforeEach(async () => {
          const housings: ReadonlyArray<HousingApi> = HOUSING_STATUS_VALUES.map(
            (status) => {
              return { ...genHousingApi(), status };
            }
          );
          await Housing().insert(housings.map(formatHousingRecordApi));
        });

        test.each(HOUSING_STATUS_VALUES)(
          'should keep housings with status %s',
          async (status) => {
            const actual = await housingRepository.find({
              filters: {
                statusList: [status]
              }
            });

            expect(actual.length).toBeGreaterThan(0);
            expect(actual).toSatisfyAll<HousingApi>(
              (housing) => housing.status === status
            );
          }
        );
      });

      describe('by substatus', () => {
        const substatus = 'Intervention publique';

        beforeEach(async () => {
          const housings: ReadonlyArray<HousingApi> = [
            { ...genHousingApi(), subStatus: substatus },
            { ...genHousingApi(), subStatus: 'Autre' }
          ];
          await Housing().insert(housings.map(formatHousingRecordApi));
        });

        it(`should keep housings with substatus "${substatus}"`, async () => {
          const actual = await housingRepository.find({
            filters: {
              subStatus: [substatus]
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>(
            (housing) => housing.subStatus === substatus
          );
        });
      });

      it('should query by an owner’s name', async () => {
        const housingList = new Array(10).fill('0').map(() => genHousingApi());
        await Housing().insert(housingList.map(formatHousingRecordApi));
        const owner: OwnerApi = {
          ...genOwnerApi(),
          fullName: 'Jean Dupont'
        };
        await Owners().insert(formatOwnerApi(owner));
        await HousingOwners().insert(
          housingList.flatMap((housing) =>
            formatHousingOwnersApi(housing, [owner])
          )
        );
        const query = 'Dupon';

        const actual = await housingRepository.find({
          filters: {
            query
          }
        });

        expect(actual).toSatisfyAll<HousingApi>(
          (housing) => housing.owner?.fullName?.includes(query) ?? false
        );
      });
    });
  });

  describe('findOne', () => {
    const housing: HousingApi = genHousingApi(oneOf(establishment.geoCodes));
    const owner: OwnerApi = genOwnerApi();
    const address: AddressApi = genAddressApi(owner.id, AddressKinds.Owner);

    beforeAll(async () => {
      await Housing().insert(formatHousingRecordApi(housing));
      await Owners().insert(formatOwnerApi(owner));
      await HousingOwners().insert(formatHousingOwnersApi(housing, [owner]));
      await Addresses().insert(formatAddressApi(address));
    });

    it('should find by id', async () => {
      const actual = await housingRepository.findOne({
        geoCode: housing.geoCode,
        id: housing.id
      });

      expect(actual).toHaveProperty('id', housing.id);
    });

    it('should find by local id', async () => {
      const actual = await housingRepository.findOne({
        geoCode: housing.geoCode,
        localId: housing.localId
      });

      expect(actual).toHaveProperty('id', housing.id);
    });

    it('should not include owner by default', async () => {
      const actual = await housingRepository.findOne({
        geoCode: housing.geoCode,
        id: housing.id
      });

      expect(actual).toHaveProperty('owner', undefined);
    });

    it('should include owner on demand', async () => {
      const actual = await housingRepository.findOne({
        geoCode: housing.geoCode,
        id: housing.id,
        includes: ['owner']
      });

      expect(actual).toHaveProperty('owner');
      expect(actual?.owner).toHaveProperty('id', owner.id);
    });

    it('should include the BAN address', async () => {
      const actual = await housingRepository.findOne({
        geoCode: housing.geoCode,
        id: housing.id,
        includes: ['owner']
      });

      expect(actual?.owner?.banAddress).toStrictEqual<AddressApi>({
        refId: owner.id,
        addressKind: AddressKinds.Owner,
        banId: address.banId,
        label: address.label,
        houseNumber: address.houseNumber,
        street: address.street,
        postalCode: address.postalCode,
        city: address.city,
        latitude: address.latitude,
        longitude: address.longitude,
        score: address.score,
        lastUpdatedAt: expect.any(String)
      });
    });
  });

  describe('stream', () => {
    const houses: HousingApi[] = Array.from({ length: 5 }).map(() =>
      genHousingApi(oneOf(establishment.geoCodes))
    );

    beforeAll(async () => {
      await Housing().insert(houses.map(formatHousingRecordApi));
    });

    it('should stream a list of housing', async () => {
      const actual = await housingRepository
        .stream({
          filters: {
            establishmentIds: [establishment.id]
          },
          includes: ['owner']
        })
        .collect()
        .toPromise(Promise);

      expect(actual).toSatisfyAll((housing) =>
        establishment.geoCodes.includes(housing.geoCode)
      );
    });
  });

  describe('save', () => {
    it('should create a housing if it does not exist', async () => {
      const housing = genHousingApi(oneOf(establishment.geoCodes));

      await housingRepository.save(housing);

      const actual = await Housing().where('id', housing.id).first();
      expect(actual).toBeDefined();
    });

    it('should update all fields of an existing housing', async () => {
      const original = genHousingApi(oneOf(establishment.geoCodes));
      await Housing().insert(formatHousingRecordApi(original));
      const update: HousingApi = {
        ...original,
        occupancy: Occupancy.RENT,
        occupancyIntended: Occupancy.COMMERCIAL_OR_OFFICE
      };

      await housingRepository.save(update, { onConflict: 'merge' });

      const actual = await Housing().where('id', original.id).first();
      expect(actual).toBeDefined();
      expect(actual).toMatchObject({
        occupancy: update.occupancy,
        occupancy_intended: update.occupancyIntended
      });
    });

    it('should update specific fields of an existing housing', async () => {
      const original: HousingApi = {
        ...genHousingApi(oneOf(establishment.geoCodes)),
        occupancy: Occupancy.VACANT,
        occupancyIntended: Occupancy.RENT
      };
      await Housing().insert(formatHousingRecordApi(original));
      const update: HousingApi = {
        ...original,
        occupancy: Occupancy.RENT,
        occupancyIntended: Occupancy.COMMERCIAL_OR_OFFICE
      };

      await housingRepository.save(update, {
        onConflict: 'merge',
        merge: ['occupancy']
      });

      const actual = await Housing().where('id', original.id).first();
      expect(actual).toBeDefined();
      expect(actual).toMatchObject({
        occupancy: update.occupancy,
        occupancy_intended: original.occupancyIntended
      });
    });
  });

  describe('remove', () => {
    it('should remove the links with a campaign in cascade', async () => {
      const housing = genHousingApi();
      await Housing().insert(formatHousingRecordApi(housing));
      const campaign = genCampaignApi(establishment.id, user.id);
      await Campaigns().insert(formatCampaignApi(campaign));
      await CampaignsHousing().insert(
        formatCampaignHousingApi(campaign, [housing])
      );

      await housingRepository.remove(housing);

      const actual = await CampaignsHousing().where({
        housing_geo_code: housing.geoCode,
        housing_id: housing.id
      });
      expect(actual).toBeArrayOfSize(0);
    });
  });

  it('should save null values', async () => {
    const housing: HousingApi = {
      ...genHousingApi(),
      subStatus: 'Sortie de la vacance'
    };
    await Housing().insert(formatHousingRecordApi(housing));

    await Housing()
      .where({ geo_code: housing.geoCode, id: housing.id })
      .update({
        sub_status: null
      });

    const actual = await Housing()
      .where({ geo_code: housing.geoCode, id: housing.id })
      .first();
    expect(actual).toMatchObject({
      sub_status: null
    });
  });
});
