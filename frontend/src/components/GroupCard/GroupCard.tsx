import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import classNames from 'classnames';
import { Link } from 'react-router-dom';

import type { Group } from '~/models/Group';
import HousingCount from '~/components/HousingCount/HousingCount';
import styles from './group-card.module.scss';

interface GroupCardProps {
  group: Group;
  isActive?: boolean;
}

function GroupCard(props: GroupCardProps) {
  const title = `Groupe de logements - ${props.group.title} - nombre de logements : ${props.group.housingCount}, nombre de propriétaires : ${props.group.ownerCount}`;

  return (
    <Link to={`/groupes/${props.group.id}`} title={title} aria-label={title}>
      <Stack
        component="article"
        direction="row"
        className={classNames(styles.container, {
          [styles.active]: props.isActive
        })}
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
      </Stack>
    </Link>
  );
}

export default GroupCard;
