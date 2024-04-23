import { Container } from '../_dsfr';
import { Group } from '../../models/Group';
import styles from './group-card.module.scss';
import HousingCount from '../HousingCount/HousingCount';
import AppLink from '../_app/AppLink/AppLink';
import Typography from '@mui/material/Typography';

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
        <Typography className={styles.title} mr={1} variant="body2">
          {props.group.title}
        </Typography>
        <HousingCount
          housingCount={props.group.housingCount}
          ownerCount={props.group.ownerCount}
        />
      </Container>
    </AppLink>
  );
}

export default GroupCard;
