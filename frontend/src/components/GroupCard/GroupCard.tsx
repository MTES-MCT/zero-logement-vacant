import { Container, Text } from '@dataesr/react-dsfr';
import { Link as RouterLink } from 'react-router-dom';

import { Group } from '../../models/Group';
import styles from './group-card.module.scss';
import HousingCount from '../HousingCount/HousingCount';

interface GroupCardProps {
  group: Group;
}

function GroupCard(props: GroupCardProps) {
  return (
    <RouterLink to={`/groupes/${props.group.id}`}>
      <Container as="article" className={styles.container} fluid>
        <Text as="span" bold className={styles.title} spacing="mr-1w mb-0">
          {props.group.title}
        </Text>
        <HousingCount
          housingCount={props.group.housingCount}
          ownerCount={props.group.ownerCount}
        />
      </Container>
    </RouterLink>
  );
}

export default GroupCard;
