import {
  isActiveOwnerRank,
  isInactiveOwnerRank,
  PREVIOUS_OWNER_RANK
} from '@zerologementvacant/models';
import { Array } from 'effect';
import { v5 as uuidv5 } from 'uuid';
import HousingMissingError from '~/errors/housingMissingError';
import OwnerMissingError from '~/errors/ownerMissingError';
import { HousingOwnerEventApi } from '~/models/EventApi';
import {
  HousingOwnerDBO
} from '~/repositories/housingOwnerRepository';
import { OwnerDBO } from '~/repositories/ownerRepository';
import {
  LOVAC_NAMESPACE,
  ReporterError,
  ReporterOptions
} from '~/scripts/import-lovac/infra';
import { EnrichedSourceHousingOwners } from './source-housing-owner-enricher';
import { SourceHousingOwner } from './source-housing-owner';

export type HousingOwnersChange = {
  type: 'housingOwners';
  kind: 'replace';
  value: ReadonlyArray<HousingOwnerDBO>;
};

export type HousingEventChange = {
  type: 'event';
  kind: 'create';
  value: HousingOwnerEventApi;
};

export type HousingOwnerChange = HousingOwnersChange | HousingEventChange;

interface TransformOptions extends ReporterOptions<SourceHousingOwner> {
  adminUserId: string;
  year: string;
}

export function createHousingOwnerTransform(options: TransformOptions) {
  const { abortEarly, reporter, adminUserId, year } = options;

  return function transform(
    enriched: EnrichedSourceHousingOwners
  ): HousingOwnerChange[] {
    const { source, existing } = enriched;
    try {
      if (!existing.housing) {
        throw new HousingMissingError(source[0]?.local_id ?? 'unknown');
      }

      const missingOwners = source.filter(
        (sourceOwner) =>
          !existing.owners.some((owner) => owner.idpersonne === sourceOwner.idpersonne)
      );
      if (missingOwners.length > 0) {
        throw new OwnerMissingError(
          ...missingOwners.map((sourceOwner) => sourceOwner.idpersonne)
        );
      }

      const housing = existing.housing;

      const existingActive = existing.existingHousingOwners.filter((ho) =>
        isActiveOwnerRank(ho.rank)
      );
      const existingInactive = existing.existingHousingOwners.filter((ho) =>
        isInactiveOwnerRank(ho.rank)
      );

      const activeOwners: HousingOwnerDBO[] = source.map(
        (sourceOwner): HousingOwnerDBO => {
          const owner = existing.owners.find(
            (owner) => owner.idpersonne === sourceOwner.idpersonne
          ) as OwnerDBO;
          return {
            owner_id: owner.id,
            housing_id: housing.id,
            housing_geo_code: housing.geo_code,
            idprocpte: sourceOwner.idprocpte,
            idprodroit: sourceOwner.idprodroit,
            rank: sourceOwner.rank,
            locprop_source: String(sourceOwner.locprop_source),
            locprop_relative_ban: null,
            locprop_distance_ban: null,
            property_right: sourceOwner.property_right,
            start_date: new Date(),
            end_date: null,
            origin: null
          };
        }
      );

      const byOwnerId = (a: HousingOwnerDBO, b: HousingOwnerDBO) =>
        a.owner_id === b.owner_id;
      const removedActive = Array.differenceWith(byOwnerId)(existingActive, activeOwners);
      const inactiveOwners: HousingOwnerDBO[] = [
        ...removedActive.map((ho) => ({
          ...ho,
          rank: PREVIOUS_OWNER_RANK,
          end_date: new Date()
        })),
        ...Array.differenceWith(byOwnerId)(existingInactive, activeOwners)
      ];

      const allOwners: ReadonlyArray<HousingOwnerDBO> = [
        ...activeOwners,
        ...inactiveOwners
      ];

      function ownerName(ownerId: string): string {
        return (
          existing.owners.find((owner) => owner.id === ownerId)?.full_name ?? ''
        );
      }

      const added = Array.differenceWith(byOwnerId)(activeOwners, existingActive);
      const removed = Array.differenceWith(byOwnerId)(existingActive, activeOwners);
      const updated = Array.intersectionWith(byOwnerId)(existingActive, activeOwners).filter(
        (existingHo) => {
          const newHo = activeOwners.find(
            (activeHo) => activeHo.owner_id === existingHo.owner_id
          );
          return newHo && newHo.rank !== existingHo.rank;
        }
      );

      const events: HousingOwnerEventApi[] = [
        ...added.map(
          (ho): HousingOwnerEventApi => ({
            id: uuidv5(
              ho.housing_id + ':housing:owner-attached:' + ho.owner_id + ':' + year,
              LOVAC_NAMESPACE
            ),
            type: 'housing:owner-attached',
            nextOld: null,
            nextNew: { name: ownerName(ho.owner_id), rank: ho.rank },
            createdAt: new Date().toJSON(),
            createdBy: adminUserId,
            ownerId: ho.owner_id,
            housingGeoCode: ho.housing_geo_code,
            housingId: ho.housing_id
          })
        ),
        ...removed.map(
          (ho): HousingOwnerEventApi => ({
            id: uuidv5(
              ho.housing_id + ':housing:owner-detached:' + ho.owner_id + ':' + year,
              LOVAC_NAMESPACE
            ),
            type: 'housing:owner-detached',
            nextOld: { name: ownerName(ho.owner_id), rank: ho.rank },
            nextNew: null,
            createdAt: new Date().toJSON(),
            createdBy: adminUserId,
            ownerId: ho.owner_id,
            housingGeoCode: ho.housing_geo_code,
            housingId: ho.housing_id
          })
        ),
        ...updated.map(
          (ho): HousingOwnerEventApi => {
            const newHo = activeOwners.find(
              (activeHo) => activeHo.owner_id === ho.owner_id
            )!;
            return {
              id: uuidv5(
                ho.housing_id + ':housing:owner-updated:' + ho.owner_id + ':' + year,
                LOVAC_NAMESPACE
              ),
              type: 'housing:owner-updated',
              nextOld: { name: ownerName(ho.owner_id), rank: ho.rank },
              nextNew: { name: ownerName(newHo.owner_id), rank: newHo.rank },
              createdAt: new Date().toJSON(),
              createdBy: adminUserId,
              ownerId: ho.owner_id,
              housingGeoCode: ho.housing_geo_code,
              housingId: ho.housing_id
            };
          }
        )
      ];

      source.forEach((sourceOwner) => reporter.passed(sourceOwner));

      return [
        { type: 'housingOwners', kind: 'replace', value: allOwners },
        ...events.map(
          (event): HousingEventChange => ({
            type: 'event',
            kind: 'create',
            value: event
          })
        )
      ];
    } catch (error) {
      source.forEach((sourceOwner) =>
        reporter.failed(
          sourceOwner,
          new ReporterError((error as Error).message, sourceOwner)
        )
      );
      if (abortEarly) throw error;
      return [];
    }
  };
}
