import { Establishment } from '../../../models/Establishment';
import { Event } from '../../../models/Event';
import { getSource } from '../../../models/Housing';
import EventCard from '../EventCard';

interface CardProps {
  event: Event<'housing:created'>;
  establishment: Establishment | null;
}

export function HousingCreatedEventCard(props: CardProps) {
  const source = props.event.nextNew.source;
  const occupancy = props.event.nextNew.occupancy;
  const title =
    source === 'datafoncier-manual'
      ? 'a ajouté ce logement'
      : 'a importé ce logement';

  return (
    <EventCard
      createdAt={props.event.createdAt}
      createdBy={props.event.creator}
      differences={[formatHousingCreatedDifferences({ source, occupancy })]}
      title={title}
    />
  );
}

type CardDescriptionOptions = Event<'housing:created'>['nextNew'];

export function formatHousingCreatedDifferences(
  options: CardDescriptionOptions
): string {
  return options.source === 'datafoncier-manual'
    ? 'Le logement a été créé manuellement.'
    : `Le logement a été importé de la base de données ${getSource({
        source: 'lovac',
        dataFileYears: [options.source]
      })}.`;
}
