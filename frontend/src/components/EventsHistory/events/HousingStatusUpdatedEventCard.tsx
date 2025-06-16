import { Predicate } from 'effect';

import { Event, formatEventHousingStatus } from '../../../models/Event';
import EventCard from '../EventCard';

interface HousingStatusEventCardProps {
  event: Event<'housing:status-updated'>;
}

export function HousingStatusUpdatedEventCard(
  props: HousingStatusEventCardProps
) {
  return (
    <EventCard
      createdAt={props.event.createdAt}
      createdBy={props.event.creator}
      differences={formatHousingStatusUpdatedDifferences({
        old: props.event.nextOld,
        new: props.event.nextNew
      })}
      title="a mis à jour le statut de suivi"
    />
  );
}

interface DifferencesOptions {
  old: Event<'housing:status-updated'>['nextOld'];
  new: Event<'housing:status-updated'>['nextNew'];
}

export function formatHousingStatusUpdatedDifferences(
  options: DifferencesOptions
): ReadonlyArray<string> {
  const statusBefore: string =
    options.old.status !== undefined
      ? `“${formatEventHousingStatus(options.old.status)}”`
      : 'vide';
  const statusAfter: string =
    options.new.status !== undefined
      ? `“${formatEventHousingStatus(options.new.status)}”`
      : 'vide';
  const subStatusBefore: string = options.old.subStatus
    ? `“${options.old.subStatus}”`
    : 'vide';
  const subStatusAfter: string = options.new.subStatus
    ? `“${options.new.subStatus}”`
    : 'vide';

  const statusChange =
    statusBefore !== statusAfter
      ? `Le statut de suivi du logement est passé de ${statusBefore} à ${statusAfter}.`
      : null;
  const subStatusChange =
    subStatusBefore !== subStatusAfter
      ? `Le sous-statut de suivi du logement est passé de ${subStatusBefore} à ${subStatusAfter}.`
      : null;

  return [statusChange, subStatusChange].filter(Predicate.isNotNull);
}
