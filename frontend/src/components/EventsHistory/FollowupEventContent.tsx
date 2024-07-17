import { Event } from '../../models/Event';
import { getSource, Housing } from '../../models/Housing';
import { Container, Text } from '../_dsfr';

interface Props {
  event: Event<Housing>;
}

function FollowupEventContent(props: Props) {
  if (
    props.event.section === 'Situation' &&
    props.event.name === 'Ajout du logement dans la base'
  ) {
    return (
      <Container as="main" fluid>
        <HousingCreatedEventContent event={props.event} />
      </Container>
    );
  }

  return <></>;
}

function HousingCreatedEventContent(props: Props) {
  const source = props.event.new ? getSource(props.event.new) : null;
  return (
    <Text spacing="mb-0">
      Le logement a été ajouté depuis la source {source}
    </Text>
  );
}

export default FollowupEventContent;
