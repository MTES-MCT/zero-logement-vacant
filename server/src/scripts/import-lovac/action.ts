import { v4 as uuidv4 } from 'uuid';

import { assertOwner, HousingApi, OccupancyKindApi } from '~/models/HousingApi';
import { EventApi, HousingEventApi, isHousingEvent } from '~/models/EventApi';
import { HousingStatusApi } from '~/models/HousingStatusApi';
import { hasAnyOwnershipModification, Modification } from './modification';
import eventRepository from '~/repositories/eventRepository';
import housingRepository from '~/repositories/housingRepository';
import userRepository from '~/repositories/userRepository';
import { UserApi } from '~/models/UserApi';
import config from '~/infra/config';
import UserMissingError from '~/errors/userMissingError';
import { getYear } from 'date-fns';

export function compare({ before, now, modifications }: Comparison): Action {
  if (before && now === null) {
    if (!hasAnyOwnershipModification(modifications)) {
      if (
        before.status !== undefined &&
        [
          HousingStatusApi.NeverContacted,
          HousingStatusApi.Waiting,
          HousingStatusApi.Completed,
        ].includes(before.status)
      ) {
        const missingEvent: HousingEventApi = {
          id: uuidv4(),
          name: `Absent du LOVAC ${getYear(new Date())}`,
          kind: 'Delete',
          category: 'Followup',
          section: 'Situation',
          conflict: false,
          housingId: before.id,
          housingGeoCode: before.geoCode,
          old: before,
          new: undefined,
          createdBy: 'system',
          createdAt: new Date(),
        };

        return {
          housing: {
            ...before,
            status: HousingStatusApi.Completed,
            subStatus: 'Sortie de la vacance',
          },
          events: [missingEvent],
        };
      }

      const conflictEvent: HousingEventApi = {
        id: uuidv4(),
        name: 'Conflit d’informations venant d’une source externe concernant le statut d’occupation',
        kind: 'Create',
        category: 'Followup',
        section: 'Situation',
        conflict: true,
        housingId: before.id,
        housingGeoCode: before.geoCode,
        old: before,
        new: undefined,
        createdBy: 'system',
        createdAt: new Date(),
      };
      return {
        housing: null,
        events: [conflictEvent],
      };
    }

    const ownershipConflict: HousingEventApi = {
      id: uuidv4(),
      name: 'Conflit d’informations possible venant d’une source externe concernant le propriétaire et/ou la propriété',
      kind: 'Create',
      category: 'Ownership',
      section: 'Propriétaire',
      conflict: true,
      housingId: before.id,
      housingGeoCode: before.geoCode,
      old: before,
      new: undefined,
      createdBy: 'system',
      createdAt: new Date(),
    };

    if (
      before.status !== undefined &&
      [HousingStatusApi.Waiting, HousingStatusApi.Completed].includes(
        before.status,
      )
    ) {
      return {
        housing: {
          ...before,
          status: HousingStatusApi.Completed,
          subStatus: 'Sortie de la vacance',
        },
        events: [ownershipConflict],
      };
    }

    if (
      before.status !== undefined &&
      before.status !== HousingStatusApi.NeverContacted
    ) {
      const occupancyConflict: HousingEventApi = {
        id: uuidv4(),
        name: 'Conflit d’informations venant d’une source externe concernant le statut d’occupation',
        kind: 'Create',
        category: 'Followup',
        section: 'Situation',
        conflict: true,
        housingId: before.id,
        housingGeoCode: before.geoCode,
        old: before,
        new: undefined,
        createdBy: 'system',
        createdAt: new Date(),
      };
      return {
        housing: null,
        events: [ownershipConflict, occupancyConflict],
      };
    }
  }

  if (before && now) {
    assertOwner(before);
    assertOwner(now);
    const dataYears = [...now.dataYears, ...before.dataYears];

    if (!hasAnyOwnershipModification(modifications)) {
      const events: HousingEventApi[] =
        before.owner.fullName !== now.owner.fullName
          ? [
              {
                id: uuidv4(),
                name: 'Changement de propriétaire principal',
                kind: 'Update',
                category: 'Ownership',
                section: 'Propriétaire',
                conflict: false,
                housingId: before.id,
                housingGeoCode: before.geoCode,
                old: before,
                new: now,
                createdBy: 'system',
                createdAt: new Date(),
              },
            ]
          : [];

      if (before.status === HousingStatusApi.NeverContacted) {
        return {
          housing: {
            ...now,
            id: before.id,
            status: before.status,
            subStatus: before.subStatus,
            precisions: before.precisions,
            vacancyReasons: before.vacancyReasons,
            energyConsumption: before.energyConsumption,
            dataYears,
          },
          events,
        };
      }

      if (before.status === HousingStatusApi.Completed) {
        const occupancyConflict: HousingEventApi = {
          id: uuidv4(),
          name: 'Conflit d’informations venant d’une source externe concernant le statut d’occupation',
          kind: 'Create',
          category: 'Followup',
          section: 'Situation',
          conflict: true,
          housingId: before.id,
          housingGeoCode: before.geoCode,
          old: before,
          new: now,
          createdBy: 'system',
          createdAt: new Date(),
        };
        return {
          housing: {
            ...before,
            owner: now.owner,
            coowners: now.coowners,
            dataYears,
          },
          events: [...events, occupancyConflict],
        };
      }

      return {
        housing: {
          ...before,
          owner: now.owner,
          coowners: now.coowners,
          dataYears,
        },
        events,
      };
    }

    const ownershipConflict: HousingEventApi = {
      id: uuidv4(),
      name: 'Conflit d’informations possible venant d’une source externe concernant le propriétaire et/ou la propriété',
      kind: 'Create',
      category: 'Ownership',
      section: 'Propriétaire',
      conflict: true,
      housingId: before.id,
      housingGeoCode: before.geoCode,
      old: before,
      new: now,
      createdBy: 'system',
      createdAt: new Date(),
    };
    if (before.status === HousingStatusApi.NeverContacted) {
      return {
        housing: {
          ...before,
          owner: now.owner,
          coowners: now.coowners,
          dataYears,
        },
        events: [ownershipConflict],
      };
    }

    if (before.status === HousingStatusApi.Completed) {
      const occupancyConflict: HousingEventApi = {
        id: uuidv4(),
        name: 'Conflit d’informations venant d’une source externe concernant le statut d’occupation',
        kind: 'Create',
        category: 'Followup',
        section: 'Situation',
        conflict: true,
        housingId: before.id,
        housingGeoCode: before.geoCode,
        old: before,
        new: now,
        createdBy: 'system',
        createdAt: new Date(),
      };
      return {
        housing: { ...before, dataYears },
        events: [ownershipConflict, occupancyConflict],
      };
    }

    return {
      housing: { ...before, dataYears },
      events: [ownershipConflict],
    };
  }

  if (before === null && now) {
    const occupancyEvent: HousingEventApi = {
      id: uuidv4(),
      name: 'Changement de statut d’occupation',
      kind: 'Update',
      category: 'Followup',
      section: 'Situation',
      conflict: false,
      housingId: now.id,
      housingGeoCode: now.geoCode,
      old: undefined,
      new: now,
      createdBy: 'system',
      createdAt: new Date(),
    };
    return {
      housing: {
        ...now,
        occupancy: OccupancyKindApi.Vacant,
        status: HousingStatusApi.NeverContacted,
      },
      events: [occupancyEvent],
    };
  }

  return {
    housing: null,
    events: [],
  };
}

export interface Action {
  housing: HousingApi | null;
  events: EventApi<unknown>[];
}

export interface Comparison {
  before: HousingApi | null;
  now: HousingApi | null;
  modifications: Modification[];
}

let system: UserApi | null = null;

export async function bulkSave(actions: Action[]): Promise<void> {
  // Retrieve the system account
  if (!system) {
    system = await userRepository.getByEmail(config.app.system);
  }
  if (!system) {
    throw new UserMissingError(config.app.system);
  }

  const housingList = actions
    .map((action) => action.housing)
    .filter((housing): housing is NonNullable<HousingApi> => housing !== null);
  const events = actions
    .flatMap((action) => action.events)
    .filter(isHousingEvent)
    .map((event) => ({
      ...event,
      createdBy: (system as UserApi).id,
    }));

  await housingRepository.saveManyWithOwner(housingList);
  // Depends on housing insertion
  await eventRepository.insertManyHousingEvents(events);
}
