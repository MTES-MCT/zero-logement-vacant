import { ReadableStream } from 'node:stream/web';

import { SourceHousingOwner } from '~/scripts/import-lovac/source-housing-owners/source-housing-owner';
import {
  genSourceHousing,
  genSourceHousingOwner,
  genSourceOwner
} from '~/scripts/import-lovac/infra/fixtures';
import { SourceOwner } from '~/scripts/import-lovac/source-owners/source-owner';
import { SourceHousing } from '~/scripts/import-lovac/source-housings/source-housing';
import {
  createSourceHousingOwnerProcessor,
  isNationalOwner,
  isNewHousing,
  isSupervised,
  ProcessorOptions
} from '~/scripts/import-lovac/source-housing-owners/source-housing-owner-processor';
import { Reporter } from '~/scripts/import-lovac/infra';
import { HousingApi } from '~/models/HousingApi';
import {
  genEstablishmentApi,
  genHousingApi,
  genHousingOwnerApi,
  genOwnerApi,
  genUserApi
} from '~/test/testFixtures';
import { HousingOwnerApi } from '~/models/HousingOwnerApi';
import { HousingStatusApi } from '~/models/HousingStatusApi';
import { OwnerApi } from '~/models/OwnerApi';
import { UserApi } from '~/models/UserApi';
import { HousingEventApi } from '~/models/EventApi';

describe('Source housing owner processor', () => {
  let auth: UserApi;
  let sourceHousing: SourceHousing;
  let sourceOwners: ReadonlyArray<SourceOwner>;
  let sourceHousingOwners: ReadonlyArray<SourceHousingOwner>;
  let housingRepository: jest.MockedObject<
    ProcessorOptions['housingRepository']
  >;
  let housingEventRepository: jest.MockedObject<
    ProcessorOptions['housingEventRepository']
  >;
  let housingOwnerRepository: jest.MockedObject<
    ProcessorOptions['housingOwnerRepository']
  >;
  let ownerRepository: jest.MockedObject<ProcessorOptions['ownerRepository']>;
  let reporter: jest.MockedObject<Reporter<SourceHousingOwner>>;

  beforeEach(() => {
    const establishment = genEstablishmentApi();
    auth = genUserApi(establishment.id);
    sourceHousing = genSourceHousing();
    sourceOwners = Array.from({ length: 3 }, () => genSourceOwner());
    sourceHousingOwners = sourceOwners.map((sourceOwner, index) => {
      return {
        ...genSourceHousingOwner(sourceHousing, sourceOwner),
        rank: (index + 1) as SourceHousingOwner['rank']
      };
    });
    housingRepository = {
      findOne: jest.fn()
    };
    housingEventRepository = {
      insert: jest.fn().mockImplementation(() => Promise.resolve())
    };
    housingOwnerRepository = {
      saveMany: jest.fn().mockImplementation(() => Promise.resolve()),
      insert: jest.fn().mockImplementation(() => Promise.resolve())
    };
    ownerRepository = {
      findOne: jest.fn(),
      findByHousing: jest.fn()
    };
    reporter = {
      passed: jest.fn(),
      skipped: jest.fn(),
      failed: jest.fn(),
      report: jest.fn()
    };
  });

  it('should fail if the housing is missing from our database', async () => {
    housingRepository.findOne.mockResolvedValue(null);
    const stream = new ReadableStream<SourceHousingOwner>({
      pull(controller) {
        sourceHousingOwners.forEach((_) => controller.enqueue(_));
        controller.close();
      }
    });
    const processor = createSourceHousingOwnerProcessor({
      auth,
      reporter,
      housingRepository,
      housingEventRepository,
      housingOwnerRepository,
      ownerRepository
    });

    await stream.pipeTo(processor);

    expect(reporter.failed).toHaveBeenCalledTimes(sourceHousingOwners.length);
  });

  it('should fail if the departmental owners are missing from our database', async () => {
    ownerRepository.findOne.mockResolvedValue(null);
    const stream = new ReadableStream<SourceHousingOwner>({
      pull(controller) {
        sourceHousingOwners.forEach((_) => controller.enqueue(_));
        controller.close();
      }
    });
    const processor = createSourceHousingOwnerProcessor({
      auth,
      reporter,
      housingRepository,
      housingEventRepository,
      housingOwnerRepository,
      ownerRepository
    });

    await stream.pipeTo(processor);

    expect(reporter.failed).toHaveBeenCalledTimes(sourceHousingOwners.length);
  });

  describe('Otherwise the housing and the departmental owners exist', () => {
    let housing: HousingApi;
    let departmentalOwners: ReadonlyArray<OwnerApi>;

    beforeEach(() => {
      housing = genHousingApi();
      housingRepository.findOne.mockResolvedValue(housing);
      departmentalOwners = sourceOwners.map((sourceOwner) => ({
        ...genOwnerApi(),
        idpersonne: sourceOwner.idpersonne
      }));
      ownerRepository.findOne.mockImplementation(async (idpersonne) => {
        return (
          departmentalOwners.find((owner) => owner.idpersonne === idpersonne) ??
          null
        );
      });
    });

    describe('If the housing owner has an internal conflict', () => {
      beforeEach(() => {
        sourceHousingOwners = sourceHousingOwners.map((sourceHousingOwner) => {
          return {
            ...sourceHousingOwner,
            conflict: true
          };
        });
      });

      it('should archive the departmental owners', async () => {
        const stream = new ReadableStream<SourceHousingOwner>({
          pull(controller) {
            sourceHousingOwners.forEach((_) => controller.enqueue(_));
            controller.close();
          }
        });
        const processor = createSourceHousingOwnerProcessor({
          auth,
          reporter,
          housingRepository,
          housingEventRepository,
          housingOwnerRepository,
          ownerRepository
        });

        await stream.pipeTo(processor);

        expect(reporter.passed).toHaveBeenCalledTimes(
          sourceHousingOwners.length
        );
        sourceHousingOwners.forEach((sourceHousingOwner, index) => {
          expect(housingOwnerRepository.insert).toHaveBeenNthCalledWith<
            [HousingOwnerApi]
          >(
            index + 1,
            expect.objectContaining({
              ownerId: departmentalOwners[index].id,
              housingId: housing.id,
              housingGeoCode: housing.geoCode,
              idprocpte: sourceHousingOwner.idprocpte,
              idprodroit: sourceHousingOwner.idprodroit,
              locprop: sourceHousingOwner.locprop,
              rank: -2
            })
          );
        });
      });
    });

    describe('If the housing was missing before LOVAC 2024', () => {
      beforeEach(() => {
        housing.dataFileYears = ['lovac-2024'];
      });

      it('should link the housing to its owners', async () => {
        const stream = new ReadableStream<SourceHousingOwner>({
          pull(controller) {
            sourceHousingOwners.forEach((_) => controller.enqueue(_));
            controller.close();
          }
        });
        const processor = createSourceHousingOwnerProcessor({
          auth,
          reporter,
          housingRepository,
          housingEventRepository,
          housingOwnerRepository,
          ownerRepository
        });

        await stream.pipeTo(processor);

        expect(reporter.passed).toHaveBeenCalledTimes(
          sourceHousingOwners.length
        );
        expect(housingOwnerRepository.insert).toHaveBeenCalledTimes(
          sourceHousingOwners.length
        );
        sourceHousingOwners.forEach((sourceHousingOwner, index) => {
          expect(housingOwnerRepository.insert).toHaveBeenNthCalledWith<
            [HousingOwnerApi]
          >(
            index + 1,
            expect.objectContaining({
              ownerId: departmentalOwners[index].id,
              housingId: housing.id,
              housingGeoCode: housing.geoCode,
              idprocpte: sourceHousingOwner.idprocpte,
              idprodroit: sourceHousingOwner.idprodroit,
              locprop: sourceHousingOwner.locprop,
              rank: sourceHousingOwner.rank
            })
          );
        });
      });
    });

    describe('Otherwise the housing was present before LOVAC 2024', () => {
      beforeEach(() => {
        housing.dataFileYears = ['lovac-2022', 'lovac-2024'];
      });

      describe('If the housing is unsupervised', () => {
        let existingOwners: ReadonlyArray<HousingOwnerApi>;

        beforeEach(async () => {
          housing.status = HousingStatusApi.Waiting;
          // Add existing owners
          existingOwners = Array.from({ length: 6 }).map<HousingOwnerApi>(
            (_, index) => {
              const owner = genOwnerApi();
              return {
                ...owner,
                ...genHousingOwnerApi(housing, owner),
                // Must be undefined to be considered as a national owner
                idpersonne: undefined,
                rank: index + 1
              };
            }
          );
          ownerRepository.findByHousing.mockResolvedValue(existingOwners);

          const stream = new ReadableStream<SourceHousingOwner>({
            pull(controller) {
              sourceHousingOwners.forEach((_) => controller.enqueue(_));
              controller.close();
            }
          });
          const processor = createSourceHousingOwnerProcessor({
            auth,
            reporter,
            housingRepository,
            housingEventRepository,
            housingOwnerRepository,
            ownerRepository
          });

          await stream.pipeTo(processor);
        });

        it('should archive the national owners', () => {
          expect(housingOwnerRepository.saveMany).toHaveBeenCalledTimes(
            sourceHousingOwners.length
          );
          expect(housingOwnerRepository.saveMany).toHaveBeenNthCalledWith(
            1,
            expect.arrayContaining(
              existingOwners.map((owner) => ({
                ...owner,
                rank: -2
              }))
            )
          );
        });

        it('should link it to the new departmental owners', () => {
          expect(housingOwnerRepository.saveMany).toHaveBeenCalledTimes(
            sourceHousingOwners.length
          );
          // For each call, a new departmental owner should be added
          sourceHousingOwners.forEach((sourceHousingOwner, index) => {
            expect(housingOwnerRepository.saveMany).toHaveBeenNthCalledWith(
              index + 1,
              expect.arrayContaining([
                expect.objectContaining<Partial<HousingOwnerApi>>({
                  idpersonne: sourceHousingOwner.idpersonne,
                  rank: sourceHousingOwner.rank
                })
              ])
            );
          });
        });

        it('should create an event "Changement de propriétaires"', () => {
          expect(housingEventRepository.insert).toHaveBeenCalledTimes(
            sourceHousingOwners.length
          );

          const event = housingEventRepository.insert.mock.calls[0][0];
          expect(event).toMatchObject<Partial<HousingEventApi>>({
            name: 'Changement de propriétaires',
            old: existingOwners as HousingOwnerApi[]
          });
          expect(event.new).toIncludeAllPartialMembers(
            existingOwners.map((owner) => ({ ...owner, rank: -2 }))
          );
          expect(event.new).toPartiallyContain<Partial<HousingOwnerApi>>({
            rank: sourceHousingOwners[0].rank
          });
        });
      });

      describe('If the housing is supervised', () => {
        let existingOwners: ReadonlyArray<HousingOwnerApi>;

        beforeEach(async () => {
          housing.status = HousingStatusApi.InProgress;
          housing.subStatus = 'En accompagnement';

          // Add existing owners
          existingOwners = Array.from({ length: 6 }).map<HousingOwnerApi>(
            (_, index) => {
              const owner = genOwnerApi();
              return {
                ...owner,
                ...genHousingOwnerApi(housing, owner),
                // Must be undefined to be considered as a national owner
                idpersonne: undefined,
                rank: index + 1
              };
            }
          );
          ownerRepository.findByHousing.mockResolvedValue(existingOwners);

          const stream = new ReadableStream<SourceHousingOwner>({
            pull(controller) {
              sourceHousingOwners.forEach((_) => controller.enqueue(_));
              controller.close();
            }
          });
          const processor = createSourceHousingOwnerProcessor({
            auth,
            reporter,
            housingRepository,
            housingEventRepository,
            housingOwnerRepository,
            ownerRepository
          });

          await stream.pipeTo(processor);
        });

        it('should insert new departmental owners as archived', () => {
          expect(housingOwnerRepository.insert).toHaveBeenCalledTimes(
            sourceHousingOwners.length
          );
          sourceHousingOwners.forEach((sourceHousingOwner, index) => {
            expect(housingOwnerRepository.insert).toHaveBeenNthCalledWith(
              index + 1,
              expect.objectContaining<Partial<HousingOwnerApi>>({
                housingId: housing.id,
                housingGeoCode: housing.geoCode,
                idprocpte: sourceHousingOwner.idprocpte,
                idprodroit: sourceHousingOwner.idprodroit,
                locprop: sourceHousingOwner.locprop,
                rank: -2
              })
            );
          });
        });
      });
    });
  });

  describe('isNewHousing', () => {
    it('should return true if dataFileYears contains only "lovac-2024"', () => {
      const housing: HousingApi = {
        ...genHousingApi(),
        dataFileYears: ['lovac-2024']
      };

      const actual = isNewHousing(housing);

      expect(actual).toBeTrue();
    });

    it('should return false otherwise', () => {
      const housing: HousingApi = {
        ...genHousingApi(),
        dataFileYears: ['lovac-2022', 'lovac-2024']
      };

      const actual = isNewHousing(housing);

      expect(actual).toBeFalse();
    });
  });

  describe('isSupervised', () => {
    it('should return true if the status is "in progress" and the substatus is "En accompagnement" or "Intervention publique"', () => {
      const housing: HousingApi = {
        ...genHousingApi(),
        status: HousingStatusApi.InProgress,
        subStatus: 'En accompagnement'
      };

      const actual = isSupervised(housing);

      expect(actual).toBeTrue();
    });

    it('should return false otherwise', () => {
      const housing: HousingApi = {
        ...genHousingApi(),
        status: HousingStatusApi.InProgress,
        subStatus: 'En instruction'
      };

      const actual = isSupervised(housing);

      expect(actual).toBeFalse();
    });
  });

  describe('isNationalOwner', () => {
    it('should return true if the housing owner has no _idpersonne_', () => {
      const housing = genHousingApi();
      const owner = genOwnerApi();
      const housingOwner: HousingOwnerApi = {
        ...genHousingOwnerApi(housing, owner),
        idpersonne: undefined
      };

      const actual = isNationalOwner(housingOwner);

      expect(actual).toBeTrue();
    });

    it('should return false if _idpersonne_ is defined', () => {
      const housing = genHousingApi();
      const owner = genOwnerApi();
      const housingOwner: HousingOwnerApi = {
        ...genHousingOwnerApi(housing, owner),
        idpersonne: 'idpersonne'
      };

      const actual = isNationalOwner(housingOwner);

      expect(actual).toBeFalse();
    });
  });
});
