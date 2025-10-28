import { Predicate } from 'effect';

import EventCard from '../EventCard';
import type { Event } from '../../../models/Event';

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

const FALLBACK_VALUE = 'vide';

export function formatHousingStatusUpdatedDifferences(
  options: DifferencesOptions
): ReadonlyArray<string> {
  const statusBefore: string =
    options.old.status !== undefined
      ? `“${options.old.status}”`
      : FALLBACK_VALUE;
  const statusAfter: string =
    options.new.status !== undefined
      ? `“${options.new.status}”`
      : FALLBACK_VALUE;
  const subStatusBefore: string = options.old.subStatus
    ? `“${options.old.subStatus}”`
    : FALLBACK_VALUE;
  const subStatusAfter: string = options.new.subStatus
    ? `“${options.new.subStatus}”`
    : FALLBACK_VALUE;

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
