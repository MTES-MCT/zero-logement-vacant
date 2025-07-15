import {
  isActiveOwnerRank,
  isInactiveOwnerRank,
  PREVIOUS_OWNER_RANK
} from '@zerologementvacant/models';
import { map } from '@zerologementvacant/utils/node';
import { Array, pipe } from 'effect';
import fp from 'lodash/fp';
import { v4 as uuidv4 } from 'uuid';

import HousingMissingError from '~/errors/housingMissingError';
import OwnerMissingError from '~/errors/ownerMissingError';
import { createLogger } from '~/infra/logger';
import { HousingEventApi, HousingOwnerEventApi } from '~/models/EventApi';
import { HousingApi } from '~/models/HousingApi';
import {
  HOUSING_OWNER_EQUIVALENCE,
  HOUSING_OWNER_RANK_EQUIVALENCE,
  HousingOwnerApi
} from '~/models/HousingOwnerApi';
import { OwnerApi } from '~/models/OwnerApi';
import { UserApi } from '~/models/UserApi';
import { ReporterError, ReporterOptions } from '~/scripts/import-lovac/infra';
import { SourceHousingOwner } from '~/scripts/import-lovac/source-housing-owners/source-housing-owner';

const logger = createLogger('sourceHousingOwnerProcessor');

export interface ProcessorOptions extends ReporterOptions<SourceHousingOwner> {
  auth: UserApi;
  housingRepository: {
    findOne(geoCode: string, localId: string): Promise<HousingApi | null>;
  };
  ownerRepository: {
    find(idpersonnes: ReadonlyArray<string>): Promise<ReadonlyArray<OwnerApi>>;
    findByHousing(housing: HousingApi): Promise<ReadonlyArray<HousingOwnerApi>>;
  };
}

export type HousingOwnersChange = {
  type: 'housingOwners';
  kind: 'replace';
  value: ReadonlyArray<HousingOwnerApi>;
};

export type HousingEventChange = {
  type: 'event';
  kind: 'create';
  value: HousingEventApi | HousingOwnerEventApi;
};

export type HousingOwnerChanges = HousingOwnersChange | HousingEventChange;

export function createSourceHousingOwnerProcessor(options: ProcessorOptions) {
  const { abortEarly, housingRepository, ownerRepository, reporter, auth } =
    options;

  return map<
    ReadonlyArray<SourceHousingOwner>,
    ReadonlyArray<HousingOwnerChanges>
  >(async (sourceHousingOwners) => {
    try {
      logger.debug('Processing source housing owner...', {
        sourceHousingOwners
      });

      const differentHousingOwners = sourceHousingOwners.filter(
        (owner) => owner.local_id !== sourceHousingOwners[0].local_id
      );
      if (differentHousingOwners.length > 0) {
        throw new Error(
          `The following housing owners are related to different housings: ${differentHousingOwners}`
        );
      }

      // Check if owner exists
      const idpersonnes = sourceHousingOwners.map((owner) => owner.idpersonne);
      const { geo_code: geoCode, local_id: localId } = sourceHousingOwners[0];
      const [housing, owners] = await Promise.all([
        housingRepository.findOne(geoCode, localId),
        ownerRepository.find(idpersonnes)
      ]);
      if (!housing) {
        throw new HousingMissingError(localId);
      }
      const missingOwners = sourceHousingOwners.filter((sourceHousingOwner) => {
        return !owners.some(
          (owner) => owner.idpersonne === sourceHousingOwner.idpersonne
        );
      });
      if (missingOwners.length > 0) {
        throw new OwnerMissingError(
          ...missingOwners.map((owner) => owner.idpersonne)
        );
      }

      const existingHousingOwners =
        await ownerRepository.findByHousing(housing);
      const existingActiveHousingOwners = existingHousingOwners.filter(
        (housingOwner) => isActiveOwnerRank(housingOwner.rank)
      );
      const existingInactiveHousingOwners = existingHousingOwners.filter(
        (housingOwner) => isInactiveOwnerRank(housingOwner.rank)
      );

      const activeHousingOwners: ReadonlyArray<HousingOwnerApi> =
        sourceHousingOwners.map((sourceHousingOwner) => {
          const owner = owners.find(
            (owner) => owner.idpersonne === sourceHousingOwner.idpersonne
          ) as OwnerApi; // Verified before

          return {
            ...owner,
            ownerId: owner.id,
            housingGeoCode: housing.geoCode,
            housingId: housing.id,
            // Source housing owner properties
            idprocpte: sourceHousingOwner.idprocpte,
            idprodroit: sourceHousingOwner.idprodroit,
            rank: sourceHousingOwner.rank,
            locprop: sourceHousingOwner.locprop_source,
            propertyRight: sourceHousingOwner.property_right,
            startDate: new Date(),
            endDate: undefined
          };
        });
      const inactiveHousingOwners: ReadonlyArray<HousingOwnerApi> = fp
        .differenceBy('id', existingActiveHousingOwners, activeHousingOwners)
        .map<HousingOwnerApi>((housingOwner) => ({
          ...housingOwner,
          // Archive the existing owners
          rank: PREVIOUS_OWNER_RANK,
          endDate: new Date()
        }))
        .concat(
          fp.differenceBy(
            'id',
            existingInactiveHousingOwners,
            activeHousingOwners
          )
        );

      const housingOwners: ReadonlyArray<HousingOwnerApi> =
        activeHousingOwners.concat(inactiveHousingOwners);

      const changes: HousingOwnerChanges[] = [
        {
          type: 'housingOwners',
          kind: 'replace',
          value: housingOwners
        }
      ];

      // Create events for housing owner changes
      const substract = Array.differenceWith(HOUSING_OWNER_EQUIVALENCE);
      const added = substract(housingOwners, existingHousingOwners);
      const removed = substract(existingHousingOwners, housingOwners);
      const updated = pipe(
        Array.intersectionWith(HOUSING_OWNER_EQUIVALENCE)(
          existingHousingOwners,
          housingOwners
        ),
        Array.filter((existingHousingOwner) => {
          return !Array.containsWith(HOUSING_OWNER_RANK_EQUIVALENCE)(
            housingOwners,
            existingHousingOwner
          );
        })
      );

      const events: ReadonlyArray<HousingOwnerEventApi> = [
        ...added.map<HousingOwnerEventApi>((housingOwner) => ({
          id: uuidv4(),
          type: 'housing:owner-attached',
          name: 'Propriétaire ajouté au logement',
          nextOld: null,
          nextNew: {
            name: housingOwner.fullName,
            rank: housingOwner.rank
          },
          createdAt: new Date().toJSON(),
          createdBy: auth.id,
          ownerId: housingOwner.ownerId,
          housingGeoCode: housingOwner.housingGeoCode,
          housingId: housingOwner.housingId
        })),
        ...removed.map<HousingOwnerEventApi>((housingOwner) => ({
          id: uuidv4(),
          type: 'housing:owner-detached',
          name: 'Propriétaire retiré du logement',
          nextOld: {
            name: housingOwner.fullName,
            rank: housingOwner.rank
          },
          nextNew: null,
          createdAt: new Date().toJSON(),
          createdBy: auth.id,
          ownerId: housingOwner.ownerId,
          housingGeoCode: housingOwner.housingGeoCode,
          housingId: housingOwner.housingId
        })),
        ...updated.map<HousingOwnerEventApi>((housingOwner) => {
          const newHousingOwner = housingOwners.find((ho) =>
            HOUSING_OWNER_EQUIVALENCE(ho, housingOwner)
          ) as HousingOwnerApi;
          return {
            id: uuidv4(),
            type: 'housing:owner-updated',
            name: 'Propriétaire mis à jour',
            nextOld: {
              name: housingOwner.fullName,
              rank: housingOwner.rank
            },
            nextNew: {
              name: newHousingOwner.fullName,
              rank: newHousingOwner.rank
            },
            createdAt: new Date().toJSON(),
            createdBy: auth.id,
            ownerId: housingOwner.ownerId,
            housingGeoCode: housingOwner.housingGeoCode,
            housingId: housingOwner.housingId
          };
        })
      ];

      // Add events to changes
      events.forEach((event) => {
        changes.push({
          type: 'event',
          kind: 'create',
          value: event
        });
      });

      sourceHousingOwners.forEach((sourceHousingOwner) => {
        reporter.passed(sourceHousingOwner);
      });
      return changes;
    } catch (error) {
      sourceHousingOwners.forEach((sourceHousingOwner) => {
        reporter.failed(
          sourceHousingOwner,
          new ReporterError((error as Error).message, sourceHousingOwner)
        );
      });

      if (abortEarly) {
        throw error;
      }
      return [];
    }
  });
}
