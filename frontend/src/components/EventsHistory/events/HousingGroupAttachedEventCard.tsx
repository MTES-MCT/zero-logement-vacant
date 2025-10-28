import EventCard from '../EventCard';
import type { Event } from '../../../models/Event';

interface Props {
  event: Event<'housing:group-attached'>;
}

export function HousingGroupAttachedEventCard(props: Props) {
  const group = props.event.nextNew;
  return (
    <EventCard
      createdAt={props.event.createdAt}
      createdBy={props.event.creator}
      differences={[formatHousingGroupAttachedDifferences(group)]}
      title="a ajouté ce logement dans un groupe"
    />
  );
}

export function formatHousingGroupAttachedDifferences(
  group: Event<'housing:group-attached'>['nextNew']
): string {
  return `Ce logement a été ajouté au groupe “${group.name}”.`;
}
