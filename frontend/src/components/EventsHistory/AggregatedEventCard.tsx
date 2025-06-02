import { Array, Predicate } from 'effect';
import { ReactNode } from 'react';
import { match } from 'ts-pattern';

import { Event } from '../../models/Event';
import EventCard from './EventCard';
import { HousingCreatedEventCardDescription } from './events/HousingCreatedEventCard';
import { HousingOccupancyEventCardDescription } from './events/HousingOccupancyUpdatedEventCard';
import { HousingStatusUpdatedEventCardDescription } from './events/HousingStatusUpdatedEventCard';

export interface AggregatedEventCardProps {
  events: Array.NonEmptyReadonlyArray<Event>;
  /**
   * @default 'a mis à jour des informations'
   */
  title?: string;
}

function AggregatedEventCard(props: AggregatedEventCardProps) {
  const createdAt = props.events[0].createdAt;
  const creator = props.events[0].creator;
  const descriptions = props.events
    .map((event) =>
      match(event)
        .returnType<ReactNode>()
        .with(
          { type: 'housing:created' },
          (event: Event<'housing:created'>) => (
            <HousingCreatedEventCardDescription source={event.nextNew.source} />
          )
        )
        .with(
          { type: 'housing:occupancy-updated' },
          (event: Event<'housing:occupancy-updated'>) => (
            <HousingOccupancyEventCardDescription
              old={event.nextOld}
              new={event.nextNew}
            />
          )
        )
        .with(
          { type: 'housing:status-updated' },
          (event: Event<'housing:status-updated'>) => (
            <HousingStatusUpdatedEventCardDescription
              old={event.nextOld}
              new={event.nextNew}
            />
          )
        )
        .otherwise(() => null)
    )
    .flat()
    .filter(Predicate.isNotNull);
  const title = props.title ?? 'a mis à jour des informations';

  return (
    <EventCard
      title={title}
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
