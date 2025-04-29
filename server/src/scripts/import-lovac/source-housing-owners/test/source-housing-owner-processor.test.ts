import { faker } from '@faker-js/faker/locale/fr';
import {
  ActiveOwnerRank,
  INACTIVE_OWNER_RANKS,
  PREVIOUS_OWNER_RANK
} from '@zerologementvacant/models';
import { flatten, toArray } from '@zerologementvacant/utils/node';
import { ReadableStream } from 'node:stream/web';
import { HousingEventApi } from '~/models/EventApi';
import { HousingApi } from '~/models/HousingApi';
import { HousingOwnerApi } from '~/models/HousingOwnerApi';
import { OwnerApi } from '~/models/OwnerApi';
import {
  genSourceHousing,
  genSourceHousingOwner,
  genSourceOwner
} from '~/scripts/import-lovac/infra/fixtures';

import { createNoopReporter } from '~/scripts/import-lovac/infra/reporters/noop-reporter';
import { SourceHousingOwner } from '~/scripts/import-lovac/source-housing-owners/source-housing-owner';
import {
  createSourceHousingOwnerProcessor,
  HousingOwnerChanges,
  ProcessorOptions
} from '~/scripts/import-lovac/source-housing-owners/source-housing-owner-processor';
import {
  genEstablishmentApi,
  genHousingApi,
  genHousingOwnerApi,
  genOwnerApi,
  genUserApi
} from '~/test/testFixtures';

describe('Source housing owner processor', () => {
  interface RunOptions {
    housingRepository: jest.MockedObject<ProcessorOptions['housingRepository']>;
    ownerRepository: jest.MockedObject<ProcessorOptions['ownerRepository']>;
    abortEarly?: boolean;
  }

  async function run(
    sourceHousingOwners: ReadonlyArray<SourceHousingOwner>,
    options: RunOptions
  ): Promise<ReadonlyArray<HousingOwnerChanges>> {
    const establishment = genEstablishmentApi();
    const auth = genUserApi(establishment.id);
    const reporter = createNoopReporter();

    const stream = new ReadableStream<ReadonlyArray<SourceHousingOwner>>({
      start(controller) {
        controller.enqueue(sourceHousingOwners);
        controller.close();
      }
    });
    const processor = createSourceHousingOwnerProcessor({
      abortEarly: options.abortEarly ?? true,
      auth,
      reporter,
      housingRepository: options.housingRepository,
      ownerRepository: options.ownerRepository
    });
    return toArray(stream.pipeThrough(processor).pipeThrough(flatten()));
  }

  it('should throw an error if one of the owners is not related to the housing and abortEarly is true', async () => {
    const sourceHousing = genSourceHousing();
    const sourceOwners = faker.helpers.multiple(genSourceOwner, {
      count: { min: 1, max: 6 }
    });
    const differentSourceHousingOwner = genSourceHousingOwner(
      genSourceHousing(),
      genSourceOwner()
    );
    const sourceHousingOwners = sourceOwners
      .map((sourceOwner) => genSourceHousingOwner(sourceHousing, sourceOwner))
      .concat(differentSourceHousingOwner);

    const doRun = async () =>
      run(sourceHousingOwners, {
        abortEarly: true,
        housingRepository: {
          findOne: jest.fn()
        },
        ownerRepository: {
          find: jest.fn(),
          findByHousing: jest.fn()
        }
      });

    await expect(doRun()).rejects.toThrow(
      `The following housing owners are related to different housings: ${differentSourceHousingOwner}`
    );
  });

  it('should throw an error if one of the owners is missing and abortEarly is true', async () => {
    const sourceHousing = genSourceHousing();
    const sourceOwners = faker.helpers.multiple(genSourceOwner, {
      count: { min: 2, max: 6 }
    });
    const sourceHousingOwners = sourceOwners.map((sourceOwner) =>
      genSourceHousingOwner(sourceHousing, sourceOwner)
    );
    const housing: HousingApi = {
      ...genHousingApi(),
      geoCode: sourceHousing.geo_code,
      localId: sourceHousing.local_id
    };
    const owners = sourceHousingOwners
      // Cut off the rest of the source housing owners
      .slice(0, 1)
      .map<OwnerApi>((sourceHousingOwner) => ({
        ...genOwnerApi(),
        idpersonne: sourceHousingOwner.idpersonne
      }));
    const missingOwners = sourceHousingOwners.slice(1);

    const doRun = async () =>
      run(sourceHousingOwners, {
        housingRepository: {
          findOne: jest.fn().mockResolvedValue(housing)
        },
        ownerRepository: {
          find: jest.fn().mockResolvedValue(owners),
          findByHousing: jest.fn()
        }
      });

    await expect(doRun()).rejects.toThrow(
      `Owner(s) ${missingOwners.map((owner) => owner.idpersonne).join(', ')} missing`
    );
  });

  it('should throw an error if the housing is missing and abortEarly is true', async () => {
    const sourceHousing = genSourceHousing();
    const sourceOwners = faker.helpers.multiple(genSourceOwner, {
      count: { min: 1, max: 6 }
    });
    const sourceHousingOwners = sourceOwners.map((sourceOwner) =>
      genSourceHousingOwner(sourceHousing, sourceOwner)
    );

    const doRun = async () =>
      run(sourceHousingOwners, {
        housingRepository: {
          findOne: jest.fn().mockResolvedValue(null)
        },
        ownerRepository: {
          find: jest.fn().mockResolvedValue(sourceOwners),
          findByHousing: jest.fn()
        }
      });

    await expect(doRun()).rejects.toThrow(
      `Housing ${sourceHousing.local_id} missing`
    );
  });

  it('should return no change if the housing is missing and abortEarly is false', async () => {
    const sourceHousing = genSourceHousing();
    const sourceOwners = faker.helpers.multiple(genSourceOwner, {
      count: { min: 1, max: 6 }
    });
    const sourceHousingOwners = sourceOwners.map((sourceOwner) =>
      genSourceHousingOwner(sourceHousing, sourceOwner)
    );

    const actual = await run(sourceHousingOwners, {
      abortEarly: false,
      housingRepository: {
        findOne: jest.fn().mockResolvedValue(null)
      },
      ownerRepository: {
        find: jest.fn(),
        findByHousing: jest.fn()
      }
    });

    expect(actual).toStrictEqual([]);
  });

  it('should return no change if one of the owners is missing and abortEarly is false', async () => {
    const sourceHousing = genSourceHousing();
    const sourceOwners = faker.helpers.multiple(genSourceOwner, {
      count: { min: 1, max: 6 }
    });
    const sourceHousingOwners = sourceOwners.map((sourceOwner) =>
      genSourceHousingOwner(sourceHousing, sourceOwner)
    );

    const actual = await run(sourceHousingOwners, {
      abortEarly: false,
      housingRepository: {
        findOne: jest.fn()
      },
      ownerRepository: {
        find: jest.fn().mockResolvedValue([]),
        findByHousing: jest.fn()
      }
    });

    expect(actual).toStrictEqual([]);
  });

  it('should create new housing owners', async () => {
    const sourceHousing = genSourceHousing();
    const sourceOwners = faker.helpers.multiple(genSourceOwner, {
      count: { min: 1, max: 6 }
    });
    const sourceHousingOwners = sourceOwners.map<SourceHousingOwner>(
      (sourceOwner, i) => ({
        ...genSourceHousingOwner(sourceHousing, sourceOwner),
        rank: (i + 1) as ActiveOwnerRank
      })
    );
    const housing: HousingApi = {
      ...genHousingApi(),
      geoCode: sourceHousing.geo_code,
      localId: sourceHousing.local_id
    };
    const owners: ReadonlyArray<OwnerApi> = sourceOwners.map((sourceOwner) => ({
      ...genOwnerApi(),
      idpersonne: sourceOwner.idpersonne
    }));

    const actual = await run(sourceHousingOwners, {
      housingRepository: {
        findOne: jest.fn().mockResolvedValue(housing)
      },
      ownerRepository: {
        find: jest.fn().mockResolvedValue(owners),
        findByHousing: jest.fn().mockResolvedValue([])
      }
    });

    expect(actual).toHaveLength(1);
    const [change] = actual;
    expect(change).toStrictEqual<HousingOwnerChanges>({
      type: 'housingOwners',
      kind: 'replace',
      value: sourceHousingOwners.map((sourceHousingOwner) => {
        return expect.objectContaining<Partial<HousingOwnerApi>>({
          // Housing-owner-related properties
          idprocpte: sourceHousingOwner.idprocpte,
          idprodroit: sourceHousingOwner.idprodroit,
          locprop: sourceHousingOwner.locprop_source,
          rank: sourceHousingOwner.rank,
          // Housing-related properties
          housingGeoCode: housing.geoCode,
          housingId: housing.id,
          // Owner-related properties
          idpersonne: sourceHousingOwner.idpersonne
        });
      })
    });
  });

  it('should replace existing active owners', async () => {
    const sourceHousing = genSourceHousing();
    const sourceOwners = faker.helpers.multiple(genSourceOwner, {
      count: { min: 1, max: 6 }
    });
    const sourceHousingOwners = sourceOwners.map<SourceHousingOwner>(
      (sourceOwner, i) => ({
        ...genSourceHousingOwner(sourceHousing, sourceOwner),
        rank: (i + 1) as ActiveOwnerRank
      })
    );
    const housing: HousingApi = {
      ...genHousingApi(),
      geoCode: sourceHousing.geo_code,
      localId: sourceHousing.local_id
    };
    const owners: ReadonlyArray<OwnerApi> = sourceOwners.map((sourceOwner) => ({
      ...genOwnerApi(),
      idpersonne: sourceOwner.idpersonne
    }));
    // There should be between 1 and 6 existing active housing owners
    const existingActiveHousingOwners: ReadonlyArray<HousingOwnerApi> =
      faker.helpers
        .multiple(genOwnerApi, {
          count: { min: 1, max: 6 }
        })
        .map((owner, i) => ({
          ...genHousingOwnerApi(housing, owner),
          rank: (i + 1) as ActiveOwnerRank
        }));

    const actual = await run(sourceHousingOwners, {
      housingRepository: {
        findOne: jest.fn().mockResolvedValue(housing)
      },
      ownerRepository: {
        find: jest.fn().mockResolvedValue(owners),
        findByHousing: jest.fn().mockResolvedValue(existingActiveHousingOwners)
      }
    });

    const replacingHousingOwners = sourceHousingOwners.map(
      (sourceHousingOwner) => {
        return expect.objectContaining<Partial<HousingOwnerApi>>({
          idprocpte: sourceHousingOwner.idprocpte,
          idprodroit: sourceHousingOwner.idprodroit,
          locprop: sourceHousingOwner.locprop_source,
          rank: sourceHousingOwner.rank,
          housingGeoCode: housing.geoCode,
          housingId: housing.id,
          idpersonne: sourceHousingOwner.idpersonne
        });
      }
    );
    expect(actual).toPartiallyContain({
      type: 'housingOwners',
      kind: 'replace',
      value: expect.arrayContaining(replacingHousingOwners)
    });
    expect(actual).toPartiallyContain({
      type: 'event',
      kind: 'create',
      value: expect.objectContaining<Partial<HousingEventApi>>({
        name: 'Changement de propriétaires',
        housingGeoCode: housing.geoCode,
        housingId: housing.id,
        old: expect.arrayContaining(existingActiveHousingOwners),
        new: expect.arrayContaining(replacingHousingOwners)
      })
    });
  });

  it('should move inactive owners to active if needed', async () => {
    const sourceHousing = genSourceHousing();
    const sourceOwners = faker.helpers.multiple(genSourceOwner, {
      count: { min: 1, max: 6 }
    });
    const sourceHousingOwners = sourceOwners.map<SourceHousingOwner>(
      (sourceOwner, i) => ({
        ...genSourceHousingOwner(sourceHousing, sourceOwner),
        rank: (i + 1) as ActiveOwnerRank
      })
    );
    const housing: HousingApi = {
      ...genHousingApi(),
      geoCode: sourceHousing.geo_code,
      localId: sourceHousing.local_id
    };
    const owners: ReadonlyArray<OwnerApi> = sourceOwners.map((sourceOwner) => ({
      ...genOwnerApi(),
      idpersonne: sourceOwner.idpersonne
    }));
    // There should be some existing inactive housing owners
    const existingInactiveHousingOwners = owners.map((owner, i) => ({
      ...genHousingOwnerApi(housing, owner),
      idprocpte: sourceHousingOwners[i].idprocpte,
      idprodroit: sourceHousingOwners[i].idprodroit,
      locprop: sourceHousingOwners[i].locprop_source,
      rank: faker.helpers.arrayElement(INACTIVE_OWNER_RANKS)
    }));

    const actual = await run(sourceHousingOwners, {
      housingRepository: {
        findOne: jest.fn().mockResolvedValue(housing)
      },
      ownerRepository: {
        find: jest.fn().mockResolvedValue(owners),
        findByHousing: jest
          .fn()
          .mockResolvedValue(existingInactiveHousingOwners)
      }
    });

    const movedHousingOwners = existingInactiveHousingOwners.map(
      (housingOwner, i) => {
        return expect.objectContaining<Partial<HousingOwnerApi>>({
          idprocpte: housingOwner.idprocpte,
          idprodroit: housingOwner.idprodroit,
          locprop: housingOwner.locprop,
          rank: (i + 1) as ActiveOwnerRank,
          housingGeoCode: housing.geoCode,
          housingId: housing.id,
          idpersonne: housingOwner.idpersonne
        });
      }
    );
    expect(actual).toPartiallyContain({
      type: 'housingOwners',
      kind: 'replace',
      value: movedHousingOwners
    });
    expect(actual).toPartiallyContain({
      type: 'event',
      kind: 'create',
      value: expect.objectContaining<Partial<HousingEventApi>>({
        name: 'Changement de propriétaires',
        housingGeoCode: housing.geoCode,
        housingId: housing.id,
        old: expect.arrayContaining(existingInactiveHousingOwners),
        new: expect.arrayContaining(movedHousingOwners)
      })
    });
  });

  it('should move replaced owners to inactive', async () => {
    const sourceHousing = genSourceHousing();
    const sourceOwners = faker.helpers.multiple(genSourceOwner, {
      count: { min: 1, max: 6 }
    });
    const sourceHousingOwners = sourceOwners.map<SourceHousingOwner>(
      (sourceOwner, i) => ({
        ...genSourceHousingOwner(sourceHousing, sourceOwner),
        rank: (i + 1) as ActiveOwnerRank
      })
    );
    const housing: HousingApi = {
      ...genHousingApi(),
      geoCode: sourceHousing.geo_code,
      localId: sourceHousing.local_id
    };
    const owners: ReadonlyArray<OwnerApi> = sourceOwners.map((sourceOwner) => ({
      ...genOwnerApi(),
      idpersonne: sourceOwner.idpersonne
    }));
    // There should be between 1 and 6 existing active housing owners
    const existingActiveHousingOwners: ReadonlyArray<HousingOwnerApi> =
      faker.helpers
        .multiple(genOwnerApi, {
          count: { min: 1, max: 6 }
        })
        .map((owner, i) => ({
          ...genHousingOwnerApi(housing, owner),
          idprocpte: faker.string.alphanumeric(10),
          idprodroit: faker.string.alphanumeric(12),
          locprop: faker.number.int(),
          rank: (i + 1) as ActiveOwnerRank
        }));

    const actual = await run(sourceHousingOwners, {
      housingRepository: {
        findOne: jest.fn().mockResolvedValue(housing)
      },
      ownerRepository: {
        find: jest.fn().mockResolvedValue(owners),
        findByHousing: jest.fn().mockResolvedValue(existingActiveHousingOwners)
      }
    });

    const movedHousingOwners = existingActiveHousingOwners.map(
      (housingOwner) => {
        return expect.objectContaining<Partial<HousingOwnerApi>>({
          rank: PREVIOUS_OWNER_RANK,
          idprocpte: housingOwner.idprocpte,
          idprodroit: housingOwner.idprodroit,
          locprop: housingOwner.locprop,
          housingGeoCode: housing.geoCode,
          housingId: housing.id,
          ownerId: housingOwner.ownerId,
          idpersonne: housingOwner.idpersonne,
          startDate: expect.any(Date),
          endDate: expect.any(Date)
        });
      }
    );
    expect(actual).toPartiallyContain({
      type: 'housingOwners',
      kind: 'replace',
      value: expect.arrayContaining(movedHousingOwners)
    });
    expect(actual).toPartiallyContain({
      type: 'event',
      kind: 'create',
      value: expect.objectContaining<Partial<HousingEventApi>>({
        name: 'Changement de propriétaires',
        housingGeoCode: housing.geoCode,
        housingId: housing.id,
        old: expect.arrayContaining(existingActiveHousingOwners),
        new: expect.arrayContaining(movedHousingOwners)
      })
    });
  });

  it('should leave the existing inactive owners untouched if no change is detected', async () => {
    const sourceHousing = genSourceHousing();
    const sourceOwners = faker.helpers.multiple(genSourceOwner, {
      count: { min: 1, max: 6 }
    });
    const sourceHousingOwners = sourceOwners.map<SourceHousingOwner>(
      (sourceOwner, i) => ({
        ...genSourceHousingOwner(sourceHousing, sourceOwner),
        rank: (i + 1) as ActiveOwnerRank
      })
    );
    const housing: HousingApi = {
      ...genHousingApi(),
      geoCode: sourceHousing.geo_code,
      localId: sourceHousing.local_id
    };
    const owners: ReadonlyArray<OwnerApi> = sourceOwners.map((sourceOwner) => ({
      ...genOwnerApi(),
      idpersonne: sourceOwner.idpersonne
    }));
    // There should be between 1 and 6 existing active housing owners
    const existingInactiveHousingOwners: ReadonlyArray<HousingOwnerApi> =
      faker.helpers
        .multiple(genOwnerApi, {
          count: { min: 1, max: 6 }
        })
        .map((owner) => ({
          ...genHousingOwnerApi(housing, owner),
          idprocpte: faker.string.alphanumeric(10),
          idprodroit: faker.string.alphanumeric(12),
          locprop: faker.number.int(),
          rank: faker.helpers.arrayElement(INACTIVE_OWNER_RANKS),
          startDate: faker.date.past(),
          endDate: new Date()
        }));

    const actual = await run(sourceHousingOwners, {
      housingRepository: {
        findOne: jest.fn().mockResolvedValue(housing)
      },
      ownerRepository: {
        find: jest.fn().mockResolvedValue(owners),
        findByHousing: jest
          .fn()
          .mockResolvedValue(existingInactiveHousingOwners)
      }
    });

    expect(actual).toPartiallyContain({
      type: 'housingOwners',
      kind: 'replace',
      value: expect.arrayContaining(
        existingInactiveHousingOwners.map((housingOwner) => {
          return expect.objectContaining<Partial<HousingOwnerApi>>({
            rank: housingOwner.rank,
            idprocpte: housingOwner.idprocpte,
            idprodroit: housingOwner.idprodroit,
            locprop: housingOwner.locprop,
            housingGeoCode: housing.geoCode,
            housingId: housing.id,
            ownerId: housingOwner.ownerId,
            idpersonne: housingOwner.idpersonne,
            startDate: expect.any(Date),
            endDate: expect.any(Date)
          });
        })
      )
    });
  });
});
