import { Event } from '../../../models/Event';
import EventCard from '../EventCard';

interface Props {
  event: Event<'housing:group-detached'>;
}

export function HousingGroupDetachedEventCard(props: Props) {
  const group = props.event.nextOld;
  return (
    <EventCard
      createdAt={props.event.createdAt}
      createdBy={props.event.creator}
      differences={[formatHousingGroupDetachedDifferences(group)]}
      title="a retiré ce logement d’un groupe"
    />
  );
}

export function formatHousingGroupDetachedDifferences(
  group: Event<'housing:group-detached'>['nextOld']
): string {
  return `Ce logement a été retiré du groupe “${group.name}”.`;
}
