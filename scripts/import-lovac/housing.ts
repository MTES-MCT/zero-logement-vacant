import { HousingApi } from '../../server/models/HousingApi';
import { HousingStatusApi } from '../../server/models/HousingStatusApi';
import { EventApi } from '../../server/models/EventApi';
import { Action } from './action';

function hasOwnershipModification(): boolean {
  return false;
}

function isNameDifferent(): boolean {
  return false;
}

interface Comparison {
  before: HousingApi | null;
  now: HousingApi | null;
  modifications: EventApi[];
}

export function compare({ before, now }: Comparison): Action {
  if (before && now === null) {
    if (!hasOwnershipModification()) {
      if (
        before.status !== undefined &&
        [
          HousingStatusApi.NeverContacted,
          HousingStatusApi.InProgress,
          HousingStatusApi.NotVacant,
          HousingStatusApi.Exit,
        ].includes(before.status)
      ) {
        // TODO: écrasement du statut
        return {
          housing: {
            ...before,
            status: HousingStatusApi.Exit,
            subStatus: 'Absent du millésime suivant',
          },
          events: [
            // Event "Changement de statut"
            // if (isNameDifferent())
          ],
        };
      } else {
        // Conflict with external sources
        // TODO: écrasement des info propriétaires
        if (isNameDifferent()) {
          // TODO: event "Changement de propriétaire principal"
        }
      }
    } else {
    }
  }

  if (before === null && now) {
    // TODO: create housing with occupancy = 'V' and status = 'Never contacted'
  }

  return {
    housing: null,
    events: [],
  };
}
