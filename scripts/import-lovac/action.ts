import { v4 as uuidv4 } from 'uuid';

import { HousingApi, OccupancyKindApi } from '../../server/models/HousingApi';
import {
  EventApi,
  HousingEventApi,
  isHousingEvent,
} from '../../server/models/EventApi';
import { HousingStatusApi } from '../../server/models/HousingStatusApi';
import { hasAnyOwnershipModification, Modification } from './modification';
import eventRepository from '../../server/repositories/eventRepository';
import housingRepository from '../../server/repositories/housingRepository';
import userRepository from '../../server/repositories/userRepository';
import { UserApi } from '../../server/models/UserApi';
import config from '../../server/utils/config';
import UserMissingError from '../../server/errors/userMissingError';

export function compare({ before, now, modifications }: Comparison): Action {
  if (before && now === null) {
    if (!hasAnyOwnershipModification(modifications)) {
      if (
        before.status !== undefined &&
        [
          HousingStatusApi.NeverContacted,
          HousingStatusApi.Waiting,
          HousingStatusApi.NotVacant,
          HousingStatusApi.Exit,
        ].includes(before.status)
      ) {
        return {
          housing: {
            ...before,
            status: HousingStatusApi.Exit,
            subStatus: 'Absent du millésime suivant',
          },
          events: [],
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
      old: before,
      new: undefined,
      createdBy: 'system',
      createdAt: new Date(),
    };

    if (
      before.status !== undefined &&
      [
        HousingStatusApi.Waiting,
        HousingStatusApi.NotVacant,
        HousingStatusApi.Exit,
      ].includes(before.status)
    ) {
      return {
        housing: {
          ...before,
          status: HousingStatusApi.Exit,
          subStatus: 'Absent du millésime suivant',
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
            energyConsumptionWorst: before.energyConsumptionWorst,
            dataYears,
          },
          events,
        };
      }

      if (
        before.status === HousingStatusApi.NotVacant ||
        before.status === HousingStatusApi.Exit
      ) {
        const occupancyConflict: HousingEventApi = {
          id: uuidv4(),
          name: 'Conflit d’informations venant d’une source externe concernant le statut d’occupation',
          kind: 'Create',
          category: 'Followup',
          section: 'Situation',
          conflict: true,
          housingId: before.id,
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

    if (
      before.status === HousingStatusApi.NotVacant ||
      before.status === HousingStatusApi.Exit
    ) {
      const occupancyConflict: HousingEventApi = {
        id: uuidv4(),
        name: 'Conflit d’informations venant d’une source externe concernant le statut d’occupation',
        kind: 'Create',
        category: 'Followup',
        section: 'Situation',
        conflict: true,
        housingId: before.id,
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
    system = await userRepository.getByEmail(config.application.system);
  }
  if (!system) {
    throw new UserMissingError(config.application.system);
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

  await housingRepository.saveMany(housingList);
  // Depends on housing insertion
  await eventRepository.insertManyHousingEvents(events);
}
