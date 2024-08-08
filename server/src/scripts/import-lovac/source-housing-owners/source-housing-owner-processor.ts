import { WritableStream } from 'node:stream/web';
import { v4 as uuidv4 } from 'uuid';

import { ReporterError, ReporterOptions } from '~/scripts/import-lovac/infra';
import { SourceHousingOwner } from '~/scripts/import-lovac/source-housing-owners/source-housing-owner';
import { HousingApi } from '~/models/HousingApi';
import { createLogger } from '~/infra/logger';
import { HousingOwnerApi } from '~/models/HousingOwnerApi';
import HousingMissingError from '~/errors/housingMissingError';
import { OwnerApi } from '~/models/OwnerApi';
import { HousingStatusApi } from '~/models/HousingStatusApi';
import OwnerMissingError from '~/errors/ownerMissingError';
import { HousingEventApi } from '~/models/EventApi';
import { UserApi } from '~/models/UserApi';

const logger = createLogger('sourceHousingOwnerProcessor');

export interface ProcessorOptions extends ReporterOptions<SourceHousingOwner> {
  auth: UserApi;
  housingRepository: {
    findOne(localId: string): Promise<HousingApi | null>;
  };
  housingEventRepository: {
    insert(event: HousingEventApi): Promise<void>;
  };
  housingOwnerRepository: {
    saveMany(housingOwners: ReadonlyArray<HousingOwnerApi>): Promise<void>;
    insert(housingOwner: HousingOwnerApi): Promise<void>;
  };
  ownerRepository: {
    findOne(idpersonne: string): Promise<OwnerApi | null>;
    findByHousing(housing: HousingApi): Promise<ReadonlyArray<HousingOwnerApi>>;
  };
}

export function createSourceHousingOwnerProcessor(opts: ProcessorOptions) {
  const {
    abortEarly,
    auth,
    housingRepository,
    housingEventRepository,
    housingOwnerRepository,
    ownerRepository,
    reporter
  } = opts;

  return new WritableStream<SourceHousingOwner>({
    async write(chunk) {
      try {
        logger.debug('Processing source housing owner...', { chunk });

        const [departmentalOwner, housing] = await Promise.all([
          ownerRepository.findOne(chunk.idpersonne),
          housingRepository.findOne(chunk.local_id)
        ]);
        if (!departmentalOwner) {
          throw new OwnerMissingError(chunk.idpersonne);
        }
        if (!housing) {
          throw new HousingMissingError(chunk.local_id);
        }

        if (isNewHousing(housing)) {
          logger.debug('Housing was missing from our database', {
            geoCode: housing.geoCode,
            localId: housing.localId,
            dataFileYears: housing.dataFileYears
          });
          const housingOwner: HousingOwnerApi = {
            ...departmentalOwner,
            ownerId: departmentalOwner.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode,
            idprocpte: chunk.idprocpte,
            idprodroit: chunk.idprodroit,
            locprop: chunk.locprop,
            rank: chunk.rank,
            startDate: new Date(),
            endDate: undefined,
            origin: 'lovac'
          };
          await housingOwnerRepository.insert(housingOwner);
          reporter.passed(chunk);
          return;
        }

        const existingOwners = await ownerRepository.findByHousing(housing);

        if (isSupervised(housing)) {
          // Archive the new departmental owners and log a conflict
          logger.debug('Housing supervised', {
            geoCode: housing.geoCode,
            localId: housing.localId,
            status: housing.status,
            subStatus: housing.subStatus
          });
          await housingOwnerRepository.insert({
            ...departmentalOwner,
            ownerId: departmentalOwner.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode,
            idprocpte: chunk.idprocpte,
            idprodroit: chunk.idprodroit,
            locprop: chunk.locprop,
            rank: -2, // Awaiting further treatment
            startDate: new Date(),
            endDate: undefined,
            origin: 'lovac'
          });
          reporter.passed(chunk);
          return;
        } else {
          // Archive the national owners
          logger.debug('Housing unsupervised', {
            geoCode: housing.geoCode,
            localId: housing.localId,
            status: housing.status,
            subStatus: housing.subStatus
          });
          const newHousingOwner: HousingOwnerApi = {
            ...departmentalOwner,
            ownerId: departmentalOwner.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode,
            idprocpte: chunk.idprocpte,
            idprodroit: chunk.idprodroit,
            locprop: chunk.locprop,
            rank: chunk.rank,
            startDate: new Date(),
            endDate: undefined,
            origin: 'lovac'
          };
          logger.debug('Inserting housing owner...', {
            housingOwner: newHousingOwner
          });
          const housingOwners = existingOwners
            .map((owner) => {
              if (isNationalOwner(owner)) {
                logger.debug('Moving national owner to rank -2', {
                  id: owner.id,
                  rank: owner.rank,
                  housing: {
                    id: housing.id,
                    geoCode: housing.geoCode
                  }
                });
                return {
                  ...owner,
                  rank: -2 // Awaiting further treatment
                };
              }
              return owner;
            })
            .concat(newHousingOwner);
          await housingOwnerRepository.saveMany(housingOwners);

          await housingEventRepository.insert({
            id: uuidv4(),
            name: 'Changement de propriétaires',
            kind: 'Update',
            category: 'Ownership',
            section: 'Propriétaire',
            conflict: true,
            old: existingOwners as HousingOwnerApi[],
            new: housingOwners,
            createdAt: new Date(),
            createdBy: auth.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          });
          reporter.passed(chunk);
          return;
        }

        reporter.skipped(chunk);
      } catch (error) {
        reporter.failed(
          chunk,
          new ReporterError((error as Error).message, chunk)
        );
        if (abortEarly) {
          throw error;
        }
      }
    }
  });
}

export function isNewHousing(housing: HousingApi): boolean {
  return (
    housing.dataFileYears.length === 1 &&
    housing.dataFileYears.includes('lovac-2024')
  );
}

export function isSupervised(housing: HousingApi): boolean {
  return (
    housing.status === HousingStatusApi.InProgress &&
    !!housing.subStatus &&
    ['En accompagnement', 'Intervention publique'].includes(housing.subStatus)
  );
}

export function isNationalOwner(housingOwner: HousingOwnerApi): boolean {
  return housingOwner.idpersonne === undefined;
}
