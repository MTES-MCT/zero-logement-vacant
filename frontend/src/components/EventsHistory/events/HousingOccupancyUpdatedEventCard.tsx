import { Predicate } from 'effect';

import { Event } from '../../../models/Event';
import { OCCUPANCY_LABELS } from '../../../models/Housing';
import EventCard from '../EventCard';

interface HousingOccupancyEventCardProps {
  event: Event<'housing:occupancy-updated'>;
}

export function HousingOccupancyUpdatedEventCard(
  props: HousingOccupancyEventCardProps
) {
  return (
    <EventCard
      createdAt={props.event.createdAt}
      createdBy={props.event.creator}
      differences={formatHousingOccupancyDifferences({
        old: props.event.nextOld,
        new: props.event.nextNew
      })}
      title="a mis à jour le statut d’occupation"
    />
  );
}

interface HousingOccupancyEventCardDescriptionProps {
  old: Event<'housing:occupancy-updated'>['nextOld'];
  new: Event<'housing:occupancy-updated'>['nextNew'];
}

const FALLBACK_VALUE = 'vide';

export function formatHousingOccupancyDifferences(
  props: HousingOccupancyEventCardDescriptionProps
): ReadonlyArray<string> {
  const occupancyBefore: string = props.old.occupancy
    ? `“${OCCUPANCY_LABELS[props.old.occupancy]}”`
    : FALLBACK_VALUE;
  const occupancyAfter: string = props.new.occupancy
    ? `“${OCCUPANCY_LABELS[props.new.occupancy]}”`
    : FALLBACK_VALUE;
  const occupancyIntendedBefore: string = props.old.occupancyIntended
    ? `“${OCCUPANCY_LABELS[props.old.occupancyIntended]}”`
    : FALLBACK_VALUE;
  const occupancyIntendedAfter: string = props.new.occupancyIntended
    ? `“${OCCUPANCY_LABELS[props.new.occupancyIntended]}”`
    : FALLBACK_VALUE;

  const occupancy =
    occupancyBefore !== occupancyAfter
      ? `Le statut d’occupation est passé de ${occupancyBefore} à ${occupancyAfter}.`
      : null;
  const occupancyIntended =
    occupancyIntendedBefore !== occupancyIntendedAfter
      ? `Le statut d’occupation prévisionnelle est passé de ${occupancyIntendedBefore} à ${occupancyIntendedAfter}.`
      : null;

  return [occupancy, occupancyIntended].filter(Predicate.isNotNull);
}
