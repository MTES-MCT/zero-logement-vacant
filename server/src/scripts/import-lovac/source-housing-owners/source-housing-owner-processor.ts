import { map } from '@zerologementvacant/utils/node';
import fp from 'lodash/fp';
import { v4 as uuidv4 } from 'uuid';

import HousingMissingError from '~/errors/housingMissingError';
import OwnerMissingError from '~/errors/ownerMissingError';
import { createLogger } from '~/infra/logger';
import { HousingEventApi } from '~/models/EventApi';
import { HousingApi } from '~/models/HousingApi';
import {
  HousingOwnerApi,
  isActiveOwnerRank,
  isInactiveOwnerRank,
  PREVIOUS_OWNER_RANK
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
  value: HousingEventApi;
};

export type HousingOwnerChanges = HousingOwnersChange | HousingEventChange;

export function createSourceHousingOwnerProcessor(options: ProcessorOptions) {
  const { abortEarly, auth, housingRepository, ownerRepository, reporter } =
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
      if (existingHousingOwners.length > 0) {
        changes.push({
          type: 'event',
          kind: 'create',
          value: {
            id: uuidv4(),
            name: 'Changement de propriétaires',
            kind: 'Update',
            category: 'Ownership',
            section: 'Propriétaire',
            old: existingHousingOwners as HousingOwnerApi[],
            new: housingOwners as HousingOwnerApi[],
            createdBy: auth.id,
            createdAt: new Date(),
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          }
        });
      }

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
