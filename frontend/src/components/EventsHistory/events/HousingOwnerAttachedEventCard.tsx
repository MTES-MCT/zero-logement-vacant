import { match } from 'ts-pattern';

import { Event } from '../../../models/Event';
import EventCard from '../EventCard';

interface Props {
  event: Event<'housing:owner-attached'>;
}

export function HousingOwnerAttachedEventCard(props: Props) {
  const owner = props.event.nextNew;

  return (
    <EventCard
      createdAt={props.event.createdAt}
      createdBy={props.event.creator}
      differences={[
        formatHousingOwnerAttachedDifferences({
          name: owner.name,
          rank: owner.rank
        })
      ]}
      title={`a ajouté un propriétaire`}
    />
  );
}

export function formatHousingOwnerAttachedDifferences(
  owner: Event<'housing:owner-attached'>['nextNew']
): string {
  const rank = match(owner.rank)
    .with(
      -2,
      () => 'Propriétaire doublon LOVAC 2024 - En attente de traitement par ZLV'
    )
    .with(-1, () => 'Propriétaire incorrect')
    .with(0, () => 'Ancien propriétaire')
    .with(1, () => 'Propriétaire principal')
    .when(
      (rank) => rank >= 2,
      () => 'Propriétaire secondaire'
    )
    .otherwise(() => 'Propriétaire');
  return `Le propriétaire “${owner.name}” a été ajouté en tant que “${rank}”.`;
}
