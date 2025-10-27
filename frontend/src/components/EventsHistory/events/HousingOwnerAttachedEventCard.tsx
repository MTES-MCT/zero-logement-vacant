import { getHousingOwnerRankLabel } from '../../../models/HousingOwner';
import EventCard from '../EventCard';
import type { Event } from '../../../models/Event';

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
  const rank = getHousingOwnerRankLabel(owner.rank);
  return `Le propriétaire “${owner.name}” a été ajouté en tant que “${rank}”.`;
}
