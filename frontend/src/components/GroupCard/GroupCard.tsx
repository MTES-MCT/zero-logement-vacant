import { Container, Icon, Text } from '@dataesr/react-dsfr';

import { Group } from '../../models/Group';
import styles from './group-card.module.scss';

interface GroupCardProps {
  group: Group;
}

function GroupCard(props: GroupCardProps) {
  return (
    <Container as="article" className={styles.container} fluid>
      <Text as="span" bold className={styles.title} spacing="mr-1w mb-0">
        {props.group.title}
      </Text>
      <Container as="section" className={styles.counts} fluid>
        <Icon
          name="ri-home-2-fill"
          iconPosition="center"
          size="1x"
          title="Logements"
        />
        <Text as="span" spacing="mr-1w mb-0">
          {props.group.housingCount}
        </Text>
        <Icon
          name="ri-user-fill"
          iconPosition="center"
          size="1x"
          title="Propriétaires"
        />
        <Text as="span" spacing="mb-0">
          {props.group.ownerCount}
        </Text>
      </Container>
    </Container>
  );
}

export default GroupCard;
