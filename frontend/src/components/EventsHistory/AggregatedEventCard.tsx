import { Array, Order, Predicate } from 'effect';
import { ReactNode } from 'react';
import { match } from 'ts-pattern';

import { Event } from '../../models/Event';
import EventCard from './EventCard';
import { formatHousingCampaignAttachedDifferences } from './events/HousingCampaignAttachedEventCard';
import { formatHousingCampaignDetachedDifferences } from './events/HousingCampaignDetachedEventCard';
import { formatHousingCreatedDifferences } from './events/HousingCreatedEventCard';
import { formatHousingGroupAttachedDifferences } from './events/HousingGroupAttachedEventCard';
import { formatHousingGroupDetachedDifferences } from './events/HousingGroupDetachedEventCard';
import { formatHousingOccupancyDifferences } from './events/HousingOccupancyUpdatedEventCard';
import { formatHousingOwnerAttachedDifferences } from './events/HousingOwnerAttachedEventCard';
import { formatHousingOwnerDetachedDifferences } from './events/HousingOwnerDetachedEventCard';
import { formatHousingOwnerUpdatedDifferences } from './events/HousingOwnerUpdatedEventCard';
import { formatHousingPrecisionAttachedDifferences } from './events/HousingPrecisionAttachedEventCard';
import { formatHousingPrecisionDetachedDifferences } from './events/HousingPrecisionDetachedEventCard';
import { formatHousingStatusUpdatedDifferences } from './events/HousingStatusUpdatedEventCard';
import { formatOwnerUpdatedDifferences } from './events/OwnerUpdatedEventCard';

export interface AggregatedEventCardProps {
  events: Array.NonEmptyReadonlyArray<Event>;
  /**
   * @default 'a mis à jour des informations'
   */
  title?: string;
}

const byDate = Order.mapInput(
  Order.Date,
  (event: Event) => new Date(event.createdAt)
);

function AggregatedEventCard(props: AggregatedEventCardProps) {
  const createdAt = props.events[0].createdAt;
  const creator = props.events[0].creator;
  const differences = props.events
    .toSorted(byDate)
    .map((event) =>
      match(event)
        .returnType<ReactNode>()
        .with({ type: 'housing:created' }, (event: Event<'housing:created'>) =>
          formatHousingCreatedDifferences({
            source: event.nextNew.source,
            occupancy: event.nextNew.occupancy
          })
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
            formatHousingPrecisionDetachedDifferences({
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
          { type: 'housing:owner-updated' },
          (event: Event<'housing:owner-updated'>) =>
            formatHousingOwnerUpdatedDifferences({
              old: event.nextOld,
              new: event.nextNew
            })
        )
        .with(
          { type: 'housing:owner-detached' },
          (event: Event<'housing:owner-detached'>) =>
            formatHousingOwnerDetachedDifferences(event.nextOld.name)
        )
        // To be implemented later...
        .with({ type: 'housing:perimeter-attached' }, () => null)
        .with({ type: 'housing:perimeter-detached' }, () => null)

        .with(
          { type: 'housing:group-attached' },
          (event: Event<'housing:group-attached'>) =>
            formatHousingGroupAttachedDifferences(event.nextNew)
        )
        .with(
          { type: 'housing:group-detached' },
          (event: Event<'housing:group-detached'>) =>
            formatHousingGroupDetachedDifferences(event.nextOld)
        )
        .with(
          { type: 'housing:group-archived' },
          (event: Event<'housing:group-archived'>) =>
            `Ce logement a été retiré du groupe “${event.nextOld.name}”.`
        )
        .with(
          { type: 'housing:group-removed' },
          (event: Event<'housing:group-removed'>) =>
            `Ce logement a été retiré du groupe “${event.nextOld.name}”.`
        )
        .with(
          { type: 'housing:campaign-attached' },
          (event: Event<'housing:campaign-attached'>) =>
            formatHousingCampaignAttachedDifferences(event.nextNew)
        )
        .with(
          { type: 'housing:campaign-detached' },
          (event: Event<'housing:campaign-detached'>) =>
            formatHousingCampaignDetachedDifferences(event.nextOld)
        )
        .with(
          { type: 'housing:campaign-removed' },
          (event: Event<'housing:campaign-removed'>) =>
            // Diverge from the `formatHousingCampaignRemovedDifferences`
            `Ce logement a été retiré de la campagne “${event.nextOld.name}”.`
        )
        .with({ type: 'owner:created' }, () => null)
        .with({ type: 'owner:updated' }, (event: Event<'owner:updated'>) =>
          formatOwnerUpdatedDifferences({
            nextOld: event.nextOld,
            nextNew: event.nextNew
          })
        )
        // Not yet needed thus not implemented
        .with({ type: 'campaign:updated' }, () => null)
        .exhaustive()
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
      includeTime={false}
    />
  );
}

export default AggregatedEventCard;
