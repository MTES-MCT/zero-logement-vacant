import { Array } from 'effect';
import { match } from 'ts-pattern';

import { Event } from '../../models/Event';
import EventCard from './EventCard';
import { HousingCreatedEventCardDescription } from './events/HousingCreatedEventCard';
import { HousingOccupancyEventCardDescription } from './events/HousingOccupancyUpdatedEventCard';

export interface AggregatedEventCardProps {
  events: Array.NonEmptyReadonlyArray<Event>;
}

function AggregatedEventCard(props: AggregatedEventCardProps) {
  const createdAt = props.events[0].createdAt;
  const creator = props.events[0].creator;
  const descriptions = props.events.flatMap((event) =>
    match(event)
      .with({ type: 'housing:created' }, (event: Event<'housing:created'>) => (
        <HousingCreatedEventCardDescription source={event.nextNew.source} />
      ))
      .with(
        { type: 'housing:occupancy-updated' },
        (event: Event<'housing:occupancy-updated'>) => (
          <HousingOccupancyEventCardDescription
            old={event.nextOld}
            new={event.nextNew}
          />
        )
      )
      .otherwise(() => null)
  );
  return (
    <EventCard
      title="a mis à jour des informations"
      description={
        <ul>
          {descriptions.map((description, index) => (
            <li key={index}>{description}</li>
          ))}
        </ul>
      }
      createdAt={createdAt}
      createdBy={creator}
    />
  );
}

export default AggregatedEventCard;
