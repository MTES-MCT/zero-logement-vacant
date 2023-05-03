import { v4 as uuidv4 } from 'uuid';

import { HousingApi, OccupancyKindApi } from '../../server/models/HousingApi';
import housingRepository from '../../server/repositories/housingRepository';
import {
  EventApi,
  HousingEventApi,
  isHousingEvent,
} from '../../server/models/EventApi';
import { HousingStatusApi } from '../../server/models/HousingStatusApi';
import { hasAnyOwnershipModification, Modification } from './modification';
import eventRepository from '../../server/repositories/eventRepository';

export interface Action {
  housing: HousingApi | null;
  events: EventApi<unknown>[];
}

export async function bulkSave(actions: Action[]): Promise<void> {
  const housingList = actions
    .map((action) => action.housing)
    .filter((housing): housing is NonNullable<HousingApi> => housing !== null);
  const events = actions
    .flatMap((action) => action.events)
    .filter(isHousingEvent);
  await Promise.all([
    housingRepository.bulkSave(housingList),
    eventRepository.insertManyHousingEvents(events),
  ]);
}

export interface Comparison {
  before: HousingApi | null;
  now: HousingApi | null;
  modifications: Modification[];
}

export function compare({ before, now, modifications }: Comparison): Action {
  if (before && now === null) {
    if (!hasAnyOwnershipModification(modifications)) {
      if (
        before.status !== undefined &&
        [
          HousingStatusApi.NeverContacted,
          HousingStatusApi.InProgress,
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
        section: 'Propriétaire',
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
        HousingStatusApi.InProgress,
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

    const occupancyConflict: HousingEventApi = {
      id: uuidv4(),
      name: 'Conflit d’informations venant d’une source externe concernant le statut d’occupation',
      kind: 'Create',
      category: 'Followup',
      section: 'Propriétaire',
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

  // Mettre à jour dataYears ?
  if (before && now) {
    if (!hasAnyOwnershipModification(modifications)) {
      const events: HousingEventApi[] =
        before.owner.email !== now.owner.email
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
          housing: now,
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
          section: 'Propriétaire',
          conflict: true,
          housingId: before.id,
          old: before,
          new: now,
          createdBy: 'system',
          createdAt: new Date(),
        };
        return {
          housing: { ...before, owner: now.owner },
          events: [...events, occupancyConflict],
        };
      }

      return {
        housing: { ...before, owner: now.owner },
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
        section: 'Propriétaire',
        conflict: true,
        housingId: before.id,
        old: before,
        new: now,
        createdBy: 'system',
        createdAt: new Date(),
      };
      return {
        housing: before,
        events: [ownershipConflict, occupancyConflict],
      };
    }

    return {
      housing: before,
      events: [ownershipConflict],
    };
  }

  if (before === null && now) {
    // TODO: create housing with occupancy = 'V' and status = 'Never contacted'
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
