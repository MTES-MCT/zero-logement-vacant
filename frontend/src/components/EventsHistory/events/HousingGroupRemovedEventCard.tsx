import { Event } from '../../../models/Event';
import EventCard from '../EventCard';

interface Props {
  event: Event<'housing:group-removed'>;
}

export function HousingGroupRemovedEventCard(props: Props) {
  const group = props.event.nextOld;
  return (
    <EventCard
      createdAt={props.event.createdAt}
      createdBy={props.event.creator}
      differences={[formatHousingGroupRemovedDifferences(group)]}
      title={`a supprimé le groupe “${group.name}” dans lequel le logement se trouvait`}
    />
  );
}

export function formatHousingGroupRemovedDifferences(
  group: Event<'housing:group-removed'>['nextOld']
): string {
  return `Ce logement a donc été retiré du groupe “${group.name}”.`;
}
