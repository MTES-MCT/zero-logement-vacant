import Typography from '@mui/material/Typography';
import classNames from 'classnames';
import { Link } from 'react-router-dom';

import { Container } from '../_dsfr';
import { Group } from '../../models/Group';
import styles from './group-card.module.scss';
import HousingCount from '../HousingCount/HousingCount';

interface GroupCardProps {
  group: Group;
  isActive?: boolean;
}

function GroupCard(props: GroupCardProps) {
  const title = `Groupe de logements - ${props.group.title}`;

  return (
    <Link to={`/groupes/${props.group.id}`} title={title}>
      <Container
        as="article"
        className={classNames(styles.container, {
          [styles.active]: props.isActive
        })}
        fluid
        role="group-card"
      >
        <Typography
          className={styles.title}
          component="h3"
          mr={1}
          variant="body2"
        >
          {props.group.title}
        </Typography>
        <HousingCount
          housingCount={props.group.housingCount}
          ownerCount={props.group.ownerCount}
        />
      </Container>
    </Link>
  );
}

export default GroupCard;
