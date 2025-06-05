import { match } from 'ts-pattern';

import { Establishment } from '../../models/Establishment';
import { Event } from '../../models/Event';
import { HousingCreatedEventCard } from './events/HousingCreatedEventCard';
import { HousingGroupArchivedEventCard } from './events/HousingGroupArchivedEventCard';
import { HousingGroupAttachedEventCard } from './events/HousingGroupAttachedEventCard';
import { HousingGroupDetachedEventCard } from './events/HousingGroupDetachedEventCard';
import { HousingGroupRemovedEventCard } from './events/HousingGroupRemovedEventCard';
import { HousingOccupancyUpdatedEventCard } from './events/HousingOccupancyUpdatedEventCard';
import { HousingOwnerAttachedEventCard } from './events/HousingOwnerAttachedEventCard';
import { HousingOwnerDetachedEventCard } from './events/HousingOwnerDetachedEventCard';
import { HousingOwnerUpdatedEventCard } from './events/HousingOwnerUpdatedEventCard';
import { HousingPrecisionAttachedEventCard } from './events/HousingPrecisionAttachedEventCard';
import { HousingPrecisionDetachedEventCard } from './events/HousingPrecisionDetachedEventCard';
import { HousingStatusUpdatedEventCard } from './events/HousingStatusUpdatedEventCard';

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
        <HousingOccupancyUpdatedEventCard event={event} />
      )
    )
    .with(
      { type: 'housing:status-updated' },
      (event: Event<'housing:status-updated'>) => (
        <HousingStatusUpdatedEventCard event={event} />
      )
    )
    .with(
      { type: 'housing:precision-attached' },
      (event: Event<'housing:precision-attached'>) => (
        <HousingPrecisionAttachedEventCard event={event} />
      )
    )
    .with(
      { type: 'housing:precision-detached' },
      (event: Event<'housing:precision-detached'>) => (
        <HousingPrecisionDetachedEventCard event={event} />
      )
    )
    .with(
      { type: 'housing:owner-attached' },
      (event: Event<'housing:owner-attached'>) => (
        <HousingOwnerAttachedEventCard event={event} />
      )
    )
    .with(
      { type: 'housing:owner-detached' },
      (event: Event<'housing:owner-detached'>) => (
        <HousingOwnerDetachedEventCard event={event} />
      )
    )
    .with(
      { type: 'housing:owner-updated' },
      (event: Event<'housing:owner-updated'>) => (
        <HousingOwnerUpdatedEventCard event={event} />
      )
    )
    .with(
      { type: 'housing:group-attached' },
      (event: Event<'housing:group-attached'>) => (
        <HousingGroupAttachedEventCard event={event} />
      )
    )
    .with(
      { type: 'housing:group-detached' },
      (event: Event<'housing:group-detached'>) => (
        <HousingGroupDetachedEventCard event={event} />
      )
    )
    .with(
      { type: 'housing:group-archived' },
      (event: Event<'housing:group-archived'>) => (
        <HousingGroupArchivedEventCard event={event} />
      )
    )
    .with(
      { type: 'housing:group-removed' },
      (event: Event<'housing:group-removed'>) => (
        <HousingGroupRemovedEventCard event={event} />
      )
    )
    .otherwise(() => null);
}

export default IndividualEventCard;
