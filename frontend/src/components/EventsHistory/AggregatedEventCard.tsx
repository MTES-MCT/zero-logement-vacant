import { Array, Predicate } from 'effect';
import { ReactNode } from 'react';
import { match } from 'ts-pattern';

import { Event } from '../../models/Event';
import EventCard from './EventCard';
import { formatHousingCreatedDifferences } from './events/HousingCreatedEventCard';
import { formatHousingOccupancyDifferences } from './events/HousingOccupancyUpdatedEventCard';
import { formatHousingOwnerAttachedDifferences } from './events/HousingOwnerAttachedEventCard';
import { formatHousingOwnerDetachedDifferences } from './events/HousingOwnerDetachedEventCard';
import { formatHousingPrecisionAttachedDifferences } from './events/HousingPrecisionAttachedEventCard';
import { formatHousingStatusUpdatedDifferences } from './events/HousingStatusUpdatedEventCard';

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
  const differences = props.events
    .map((event) =>
      match(event)
        .returnType<ReactNode>()
        .with({ type: 'housing:created' }, (event: Event<'housing:created'>) =>
          formatHousingCreatedDifferences({ source: event.nextNew.source })
        )
        .with(
          { type: 'housing:occupancy-updated' },
          (event: Event<'housing:occupancy-updated'>) =>
            formatHousingOccupancyDifferences({
              old: event.nextOld,
              new: event.nextNew
            })
        )
        .with(
          { type: 'housing:status-updated' },
          (event: Event<'housing:status-updated'>) =>
            formatHousingStatusUpdatedDifferences({
              old: event.nextOld,
              new: event.nextNew
            })
        )
        .with(
          { type: 'housing:precision-attached' },
          (event: Event<'housing:precision-attached'>) =>
            formatHousingPrecisionAttachedDifferences({
              category: event.nextNew.category,
              label: event.nextNew.label
            })
        )
        .with(
          { type: 'housing:precision-detached' },
          (event: Event<'housing:precision-detached'>) =>
            formatHousingPrecisionAttachedDifferences({
              category: event.nextOld.category,
              label: event.nextOld.label
            })
        )
        .with(
          { type: 'housing:owner-attached' },
          (event: Event<'housing:owner-attached'>) =>
            formatHousingOwnerAttachedDifferences({
              name: event.nextNew.name,
              rank: event.nextNew.rank
            })
        )
        .with(
          { type: 'housing:owner-detached' },
          (event: Event<'housing:owner-detached'>) =>
            formatHousingOwnerDetachedDifferences(event.nextOld.name)
        )
        .otherwise(() => null)
    )
    .flat()
    .filter(Predicate.isNotNull);
  const title = props.title ?? 'a mis à jour des informations';

  return (
    <EventCard
      title={title}
      differences={differences}
      createdAt={createdAt}
      createdBy={creator}
    />
  );
}

export default AggregatedEventCard;
