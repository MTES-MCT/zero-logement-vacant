import { Event } from '../../../models/Event';
import EventCard from '../EventCard';

interface Props {
  event: Event<'housing:owner-detached'>;
}

export function HousingOwnerDetachedEventCard(props: Props) {
  const owner = props.event.nextOld;

  return (
    <EventCard
      createdAt={props.event.createdAt}
      createdBy={props.event.creator}
      differences={[formatHousingOwnerDetachedDifferences(owner.name)]}
      title={`a ajouté un propriétaire`}
    />
  );
}

export function formatHousingOwnerDetachedDifferences(name: string): string {
  return `Le propriétaire “${name}” a été retiré des propriétaires.`;
}
