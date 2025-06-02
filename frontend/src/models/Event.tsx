import { EventDTO, EventType } from '@zerologementvacant/models';
import { Predicate } from 'effect';
import { match } from 'ts-pattern';

import { OCCUPANCY_LABELS } from './Housing';
import { getHousingState } from './HousingState';
import { fromUserDTO, User } from './User';

export type Event<Type extends EventType = EventType> = Omit<
  EventDTO<Type>,
  'creator'
> & {
  creator: User;
};

export function fromEventDTO<Type extends EventType>(
  event: EventDTO<Type>
): Event<Type> {
  if (!event.creator) {
    throw new Error('Event creator is missing');
  }

  return {
    ...event,
    creator: fromUserDTO(event.creator)
  };
}

export function getDescription(event: Event): ReadonlyArray<string> {
  return (
    match(event)
      // TODO: { type: 'housing:created' }
      .with(
        { type: 'housing:occupancy-updated' },
        (event: Event<'housing:occupancy-updated'>) => {
          const occupancyBefore: string = event.nextOld.occupancy
            ? `“${OCCUPANCY_LABELS[event.nextOld.occupancy]}”`
            : 'vide';
          const occupancyAfter: string = event.nextNew.occupancy
            ? `“${OCCUPANCY_LABELS[event.nextNew.occupancy]}”`
            : 'vide';
          const occupancyIntendedBefore: string = event.nextOld
            .occupancyIntended
            ? `“${OCCUPANCY_LABELS[event.nextOld.occupancyIntended]}”`
            : 'vide';
          const occupancyIntendedAfter: string = event.nextNew.occupancyIntended
            ? `“${OCCUPANCY_LABELS[event.nextNew.occupancyIntended]}”`
            : 'vide';

          const changes = {
            occupancy:
              occupancyBefore !== occupancyAfter
                ? `Le statut d’occupation est passé de ${occupancyBefore} à ${occupancyAfter}`
                : null,
            occupancyIntended:
              occupancyIntendedBefore !== occupancyIntendedAfter
                ? `Le statut d’occupation prévisionnelle est passé de ${occupancyIntendedBefore} à ${occupancyIntendedAfter}`
                : null
          };
          return [changes.occupancy, changes.occupancyIntended].filter(
            Predicate.isNotNull
          );
        }
      )
      .with(
        { type: 'housing:status-updated' },
        (event: Event<'housing:status-updated'>) => {
          const statusBefore: string = event.nextOld.status
            ? `“${getHousingState(event.nextOld.status)}”`
            : 'vide';
          const statusAfter: string = event.nextNew.status
            ? `“${getHousingState(event.nextNew.status)}”`
            : 'vide';
          const subStatusBefore: string = event.nextOld.subStatus
            ? `“${event.nextOld.subStatus}”`
            : 'vide';
          const subStatusAfter: string = event.nextNew.subStatus
            ? `“${event.nextNew.subStatus}”`
            : 'vide';

          const changes = {
            status:
              event.nextOld.status &&
              event.nextNew.status &&
              event.nextOld.status !== event.nextNew.status
                ? `Le statut de suivi du logement est passé de ${statusBefore} à ${statusAfter}`
                : null,
            subStatus:
              event.nextOld.subStatus !== event.nextNew.subStatus
                ? `Le sous statut de suivi du logement est passé de ${subStatusBefore} à ${subStatusAfter}`
                : null
          };
          return [changes.status, changes.subStatus].filter(
            Predicate.isNotNull
          );
        }
      )
      .otherwise(() => [])
      .flat()
  );
}
