import { Container, Text } from '../_dsfr';
import { Group } from '../../models/Group';
import styles from './group-card.module.scss';
import HousingCount from '../HousingCount/HousingCount';
import AppLink from '../_app/AppLink/AppLink';

interface GroupCardProps {
  group: Group;
}

function GroupCard(props: GroupCardProps) {
  return (
    <AppLink to={`/groupes/${props.group.id}`}>
      <Container
        as="article"
        className={styles.container}
        fluid
        role="group-card"
      >
        <Text as="span" bold className={styles.title} spacing="mr-1w mb-0">
          {props.group.title}
        </Text>
        <HousingCount
          housingCount={props.group.housingCount}
          ownerCount={props.group.ownerCount}
        />
      </Container>
    </AppLink>
  );
}

export default GroupCard;
