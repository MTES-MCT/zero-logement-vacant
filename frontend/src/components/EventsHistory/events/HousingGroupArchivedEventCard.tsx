import EventCard from '../EventCard';
import type { Event } from '../../../models/Event';

interface Props {
  event: Event<'housing:group-archived'>;
}

export function HousingGroupArchivedEventCard(props: Props) {
  const group = props.event.nextOld;
  return (
    <EventCard
      createdAt={props.event.createdAt}
      createdBy={props.event.creator}
      differences={[formatHousingGroupArchivedDifferences(group)]}
      title={`a archivé le groupe “${group.name}” dans lequel le logement se trouvait`}
    />
  );
}

export function formatHousingGroupArchivedDifferences(
  group: Event<'housing:group-archived'>['nextOld']
): string {
  return `Ce logement a donc été retiré du groupe “${group.name}”.`;
}
