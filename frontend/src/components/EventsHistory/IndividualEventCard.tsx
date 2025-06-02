import { match } from 'ts-pattern';
import { Establishment } from '../../models/Establishment';

import { Event } from '../../models/Event';
import { HousingCreatedEventCard } from './events/HousingCreatedEventCard';
import { HousingOccupancyEventCard } from './events/HousingOccupancyEventCard';

export interface IndividualEventCardProps {
  event: Event;
  establishment: Establishment | null;
}

function IndividualEventCard(props: IndividualEventCardProps) {
  return match(props.event)
    .with({ type: 'housing:created' }, (event: Event<'housing:created'>) => (
      <HousingCreatedEventCard
        event={event}
        establishment={props.establishment}
      />
    ))
    .with(
      { type: 'housing:occupancy-updated' },
      (event: Event<'housing:occupancy-updated'>) => (
        <HousingOccupancyEventCard event={event} />
      )
    )

    .otherwise(() => null);
}

export default IndividualEventCard;
