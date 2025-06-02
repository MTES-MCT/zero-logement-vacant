import { Predicate } from 'effect';

import { Event } from '../../../models/Event';
import { getHousingState } from '../../../models/HousingState';
import AggregatedEventCard from '../AggregatedEventCard';

interface HousingStatusEventCardProps {
  event: Event<'housing:status-updated'>;
}

export function HousingStatusUpdatedEventCard(
  props: HousingStatusEventCardProps
) {
  return (
    <AggregatedEventCard
      events={[props.event]}
      title="a mis à jour le statut de suivi"
    />
  );
}

interface HousingStatusEventCardDescriptionProps {
  old: Event<'housing:status-updated'>['nextOld'];
  new: Event<'housing:status-updated'>['nextNew'];
}

export function HousingStatusUpdatedEventCardDescription(
  props: HousingStatusEventCardDescriptionProps
) {
  const statusBefore: string =
    props.old.status !== undefined
      ? `“${getHousingState(props.old.status).title}”`
      : 'vide';
  const statusAfter: string =
    props.new.status !== undefined
      ? `“${getHousingState(props.new.status).title}”`
      : 'vide';
  const subStatusBefore: string = props.old.subStatus
    ? `“${props.old.subStatus}”`
    : 'vide';
  const subStatusAfter: string = props.new.subStatus
    ? `“${props.new.subStatus}”`
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
