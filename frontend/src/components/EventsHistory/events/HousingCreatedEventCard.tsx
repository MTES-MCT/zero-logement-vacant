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
  const title =
    source === 'datafoncier-manual'
      ? 'a ajouté ce logement'
      : 'a importé ce logement';

  return (
    <EventCard
      createdAt={props.event.createdAt}
      createdBy={props.event.creator}
      description={<HousingCreatedEventCardDescription source={source} />}
      title={title}
    />
  );
}

interface CardDescriptionProps {
  source: Event<'housing:created'>['nextNew']['source'];
}

export function HousingCreatedEventCardDescription(
  props: CardDescriptionProps
) {
  return props.source === 'datafoncier-manual'
    ? null
    : `Le logement a été créé via l’import de la base de données ${getSource({
        source: 'lovac',
        dataFileYears: [props.source]
      })}`;
}
